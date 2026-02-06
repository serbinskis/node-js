import cv2
import numpy as np
from pathlib import Path
import time
import subprocess

# ================= CONFIG =================

INPUT_DIR = Path(r"D:\Tapo C100")
OUTPUT_DIR = Path(r"D:\Tapo")

FINAL_VIDEO  = OUTPUT_DIR / "motion_video_with_audio.mp4"
SEGMENTS_TXT = OUTPUT_DIR / "segments.txt"

COMPARE_EVERY = 30
MOTION_THRESHOLD = 0.02   # jimp-distance scale (IMPORTANT)
SILENCE_TIMEOUT = 30.0
PRE_ROLL_SECONDS = 30.0
CROP_TOP = 40

# =========================================

def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}")

def frame_diff_jimp(a, b):
    # Jimp-like normalized RMS color distance
    diff = a.astype(np.float32) - b.astype(np.float32)
    return np.sqrt(np.mean(diff ** 2)) / 255.0

def write_concat_file(segments):
    if not segments:
        log("No motion segments found")
        return False

    with open(SEGMENTS_TXT, "w", encoding="utf-8") as f:
        for video, start, end in segments:
            f.write(
                f"file '{video.as_posix()}'\n"
                f"inpoint {start:.3f}\n"
                f"outpoint {end:.3f}\n"
            )

    log(f"Wrote {len(segments)} segments")
    return True

def process_videos():
    videos = sorted(INPUT_DIR.glob("*.mp4"))
    log(f"Found {len(videos)} videos")

    segments = []

    cv2.namedWindow("Preview", cv2.WINDOW_NORMAL)
    cv2.resizeWindow("Preview", 640, 360)

    for video in videos:
        log(f"Opening video: {video.name}")

        cap = cv2.VideoCapture(str(video))
        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_time = 1.0 / fps

        ret, prev_full = cap.read()
        if not ret:
            cap.release()
            continue

        prev_frame = prev_full[CROP_TOP:, :]  # COLOR, not gray

        frame_idx = 0
        t = 0.0
        last_logged_second = -1

        motion_active = False
        last_motion_time = 0.0
        segment_start = 0.0

        while True:
            ret, full_frame = cap.read()
            if not ret:
                break

            frame_idx += 1
            t += frame_time
            sec = int(t)

            crop = full_frame[CROP_TOP:, :]  # COLOR

            if frame_idx % COMPARE_EVERY == 0:
                diff = frame_diff_jimp(prev_frame, crop)

                cv2.imshow("Preview", crop)
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    cap.release()
                    cv2.destroyAllWindows()
                    return segments

                if sec != last_logged_second:
                    last_logged_second = sec
                    log(f"{video.name} t={sec}s diff={diff:.4f}")

                if diff > MOTION_THRESHOLD:
                    if not motion_active:
                        segment_start = max(0.0, t - PRE_ROLL_SECONDS)
                        log(f"{video.name} t={sec}s diff={diff:.4f} 🎯 MOTION")
                    motion_active = True
                    last_motion_time = t

            if motion_active:
                if t - last_motion_time <= SILENCE_TIMEOUT:
                    cv2.imshow("Preview", crop)
                    if cv2.waitKey(1) & 0xFF == ord('q'):
                        cap.release()
                        cv2.destroyAllWindows()
                        return segments
                else:
                    segments.append((video, segment_start, last_motion_time))
                    log(f"{video.name} segment {segment_start:.2f} → {last_motion_time:.2f}")
                    motion_active = False

            prev_frame = crop

        if motion_active:
            segments.append((video, segment_start, last_motion_time))
            log(f"{video.name} segment {segment_start:.2f} → {last_motion_time:.2f}")

        cap.release()
        write_concat_file(segments)

    cv2.destroyAllWindows()
    return segments

def render_final_video():
    log("🎬 Rendering final video")

    cmd = [
        "ffmpeg",
        "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", str(SEGMENTS_TXT),
        "-map", "0:v:0",
        "-map", "0:a:0?",
        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", "64k",
        "-ar", "8000",
        "-ac", "1",
        str(FINAL_VIDEO)
    ]

    subprocess.run(cmd, check=True)
    log(f"✅ Final video: {FINAL_VIDEO}")

if __name__ == "__main__":
    segments = process_videos()
    if write_concat_file(segments):
        render_final_video()
    else:
        log("Done (no output)")
