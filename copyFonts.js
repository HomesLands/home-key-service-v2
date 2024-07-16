const fs = require('fs-extra');
const path = require('path');

const srcFontsDir = path.join(__dirname, 'src/controllers/homeKey/fonts');
const destFontsDir = path.join(__dirname, 'build/controllers/homeKey/fonts');

const srcImageFile = path.join(__dirname, 'src/controllers/homeKey/homeland-logo.jpg');  // Đường dẫn đến ảnh
const destImageFile = path.join(__dirname, 'build/controllers/homeKey/homeland-logo.jpg');

// Copy fonts folder
fs.copy(srcFontsDir, destFontsDir, err => {
    if (err) {
        return console.error('Error copying fonts:', err);
    }
    console.log('Fonts copied successfully!');
});

// Copy image file
fs.copy(srcImageFile, destImageFile, err => {
    if (err) {
        return console.error('Error copying image:', err);
    }
    console.log('Image copied successfully!');
});
