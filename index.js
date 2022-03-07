const mm = require('music-metadata');
const {
    createCanvas,
    loadImage,
    registerFont
} = require('canvas')
const StackBlur = require('stackblur-canvas');
const Vibrant = require('node-vibrant')
const videoshow = require('videoshow')
const cliProgress = require('cli-progress');
const colors = require('ansi-colors');
const fs = require('fs');
const inquirer = require('inquirer');
const path = require("path");

const canvas = createCanvas(1920, 1080)
const ctx = canvas.getContext('2d')

function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

getSettings()

async function getSettings() {

    let songs = []

    let inputPath = "./input"

    if (!fs.existsSync(inputPath)) fs.mkdirSync(inputPath);

    fs.readdir(inputPath, (err, files) => {
        files.forEach(file => {
            // Get the file extension
            let type = file.split(".")[1]

            // Make sure its a music file
            if (type == "flac") songs.push(file)
            else if (type == "mp3") songs.push(file)
            else if (type == "m4a") songs.push(file)

            // File does not match requirements
            else songs.push({
                name: file,
                disabled: 'Not a valid type (mp3/m4a/flac)',
            }, )
        });

        if (songs.length == 0) return console.log("You must add songs to the input directory, files must be mp3/m4a/flac")

        inquirer
            .prompt([{
                    type: 'list',
                    name: 'file',
                    message: 'Which file would you like to use?',
                    choices: songs,
                },
                {
                    type: 'input',
                    name: 'fps',
                    message: "What would you like the video fps to be?\n(Will increase file size and time to render)\n:",
                    validate(value) {
                        if (value >= 1 && value <= 60) return true;
                        return 'Please enter a valid number between 1 and 60\n:';
                    },
                }
            ])
            .then((answers) => {
                createBaseImage(answers)
            });
    });
}

async function createBaseImage(settings) {
    try {

        const metadata = await mm.parseFile(`./input/${settings.file}`);
        let tags = metadata

        let [duration, track, title, artists, album, genre, year, copyright, picture] = [tags.format.duration, tags.common.track, tags.common.title, tags.common.artists, tags.common.album, tags.common.genre, tags.common.year, tags.common.copyright, tags.common.picture[0]]


        img = `data:${picture.format};base64,${picture.data.toString('base64')}`;
        // fs.writeFileSync("test.txt", img)

        // Draw cat with lime helmet
        loadImage(img).then(async (image) => {

            // Set it as background

            ctx.drawImage(image, 0, -540, canvas.width, canvas.width)
            const buffer_color = canvas.toBuffer("image/png");

            Vibrant.from(buffer_color).getPalette(async (err, palette) => {

                let [r, g, b] = palette.Vibrant._rgb
                let [r2, g2, b2] = palette.DarkVibrant._rgb

                let hex = rgbToHex(r, g, b)
                let hex2 = rgbToHex(r2, g2, b2)

                StackBlur.canvasRGBA(canvas, 0, 0, 1920, 1080, 30);

                ctx.globalAlpha = 0.7;
                ctx.fillStyle = 'black';
                ctx.fillRect(0, 0, canvas.width, canvas.width);
                ctx.globalAlpha = 1.0;

                ctx.shadowColor = hex;
                ctx.shadowBlur = 30;
                ctx.drawImage(image, canvas.width / 6, 284, 512, 512)
                // Add text
                registerFont('./montserrat.ttf', {
                    family: 'sans-serif'
                })

                ctx.font = '30px sans-serif'
                ctx.textAlign = "center"
                ctx.fillStyle = "white";

                // UNUSED: track, genre, copyright, year, duration

                ctx.shadowBlur = 60;

                // Song Artists
                ctx.fillText(artists.join(","), canvas.width / 1.5, canvas.height / 3.2)

                // Song Album
                ctx.fillText(album, canvas.width / 1.5, canvas.height / 2.2)


                // Bold
                ctx.font = 'bold 30px sans-serif'

                // Song Title
                ctx.fillText(title, canvas.width / 1.5, canvas.height / 2.7)

                ctx.shadowBlur = 0;

                // ctx.strokeStyle = "white";

                ctx.fillStyle = hex2;

                ctx.beginPath();
                ctx.rect((canvas.width / 1.5) - (650 / 2), canvas.height / 1.8, 650, 40);
                ctx.stroke();
                ctx.fill()

                ctx.fillStyle = hex;

                // Create the temp folder if it does not exist
                var dir = './tmp';

                if (fs.existsSync(dir)) fs.rmSync(dir, {
                    recursive: true,
                    force: true
                });

                await renderer(duration, dir, settings)
            })
        })

    } catch (error) {
        // console.error(error.message);
    }
};

async function renderer(duration, tempDir, settings) {

    fs.mkdirSync(tempDir)

    let frames = Math.round(duration * settings.fps)

    const framesCompleted = new cliProgress.SingleBar({
        format: colors.cyan('{bar}') + '| {percentage}% | ETA: {eta}s | Frames Rendered: {value}/{total}',
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true,
        clearOnComplete: true,
    }, cliProgress.Presets.shades_classic);

    framesCompleted.start(frames, 0);

    let images = []

    for (let frame = 0; frame < frames; frame++) {

        // Create all frames needed
        ctx.beginPath();
        ctx.rect((canvas.width / 1.5) - (650 / 2), canvas.height / 1.8, (frame / frames) * 650, 40);
        ctx.stroke();
        ctx.fill()

        // Save the image
        const buffer = canvas.toBuffer("image/png");

        let name = frame.toString()

        if (name.length == 1) name = "00" + name
        else if (name.length == 2) name = "0" + name

        images.push(`${tempDir}/${name}.png`)

        framesCompleted.update(frame);

        fs.writeFileSync(`${tempDir}/${name}.png`, buffer);
    }

    framesCompleted.stop();
    
    createVideo(images, settings, tempDir, (duration / frames))
}

async function createVideo(images, settings, tempDir, time) {

    console.log("Rendering video from frames, this may take some time.")

    var finalVideoPath = './output/'

    if (!fs.existsSync(finalVideoPath)) fs.mkdirSync(finalVideoPath);
    
    // console.log(images)
    // console.log(images.length)
    // console.log(settings.fps)
    // return console.log(time)

    // setup videoshow options
    var videoOptions = {
        fps: settings.fps,
        loop: time,
        transition: false,
        videoBitrate: 2048,
        videoCodec: 'libx264',
        size: '1920x1080',
        audioBitrate: '320k',
        format: 'mp4',
        pixelFormat: 'yuv420p'
    }

    videoshow(images, videoOptions)

        .audio(`./input/${settings.file}`)
        .save(finalVideoPath + "output.mp4")

        // .on('start', function (command) {
        //     console.log('ffmpeg process started, this may take some time.')
        // })
        .on('error', function (err, stdout, stderr) {
            console.error('Error:', err)
            console.error('ffmpeg stderr:', stderr)
        })
        .on('end', function (output) {
            console.error('Video created in:', output)
        })

}