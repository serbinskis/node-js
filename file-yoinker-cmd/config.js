module.exports = {
    MAX_SIZE: 1024*1024*200, //Maximum size of image in bytes
    EMAIL: "",
    PASSWORD: "",
    BASE_DIR_ID: "",
    formats: {},
    FILE_TYPES: [],
	FOLDERS: [
		require('os').homedir() + "\\Desktop",
		require('os').homedir() + "\\Documents",
		require('os').homedir() + "\\Downloads",
	],
}

module.exports.formats.ARCHIVE_FILES = 'rar|zip|7z|tar';
module.exports.formats.WORD_FILES = 'doc|docm|docx|dot|dotm|dotx|odt';
module.exports.formats.POWERPOINT_FILES = 'pptx|pptm|ppt|potx|potm|pps';
module.exports.formats.DOCUMENT = 'pdf';

module.exports.formats.TEXT = 'txt|ini|cfg|xml|csv';
module.exports.formats.IMAGES = 'gif|jped|jpg|png|bmp|tiff|psd|eps|webp';
module.exports.formats.AUDIO = 'mp3|wav|wma|mpa|ram|ra|aac|aif|m4a';
module.exports.formats.VIDEO = 'avi|mpg|mpe|mpeg|asf|wmv|mov|qt|rm|mp4|flv|m4v|webm|ogv|ogg|mkv|ts';
module.exports.formats.EXECUTABLES = 'exe|msi|com|bat|cmd|apk';

for (const [key, value] of Object.entries(module.exports.formats)) {
    module.exports.FILE_TYPES = module.exports.FILE_TYPES.concat(value.split('|'))
}
