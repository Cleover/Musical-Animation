const mm = require('music-metadata');
const fs = require('fs');
const {
    createCanvas,
    loadImage,
    registerFont
} = require('canvas')
const StackBlur = require('stackblur-canvas');
const Vibrant = require('node-vibrant')

function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

letsGo()

async function letsGo() {
    try {
        const metadata = await mm.parseFile('./input/song.mp3');
        let tags = metadata
        let [duration, track, title, artists, album, genre, year, copyright, picture] = [tags.format.duration, tags.common.track, tags.common.title, tags.common.artists, tags.common.album, tags.common.genre, tags.common.year, tags.common.copyright, tags.common.picture[0]]

        img = `data:${picture.format};base64,${picture.data.toString('base64')}`;
        // fs.writeFileSync("test.txt", img)

        const canvas = createCanvas(1920, 1080)

        const ctx = canvas.getContext('2d')

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

                // Song Artists
                ctx.fillText(artists.join(","), canvas.width / 1.5, canvas.height / 3.3)

                // Song Album
                ctx.fillText(album, canvas.width / 1.5, canvas.height / 2.3)


                // Bold
                ctx.font = 'bold 30px sans-serif'

                // Song Title
                ctx.fillText(title, canvas.width / 1.5, canvas.height / 2.8)

                ctx.shadowBlur = 0;

                // ctx.strokeStyle = "white";

                ctx.fillStyle = hex2;

                ctx.beginPath();
                ctx.rect((canvas.width / 1.5) - (650/2), canvas.height / 1.9, 650, 40);
                ctx.stroke();
                ctx.fill()

                ctx.fillStyle = hex;

                let time = 240

                ctx.beginPath();
                await ctx.rect((canvas.width / 1.5) - (650/2), canvas.height / 1.9, (time / duration) * 650, 40);
                ctx.stroke();
                ctx.fill()

                //ctx.fillText(`${copyright} (${year})`, canvas.width / 1.5, canvas.height / 2.4)

                const buffer = canvas.toBuffer("image/png");
                fs.writeFileSync("./image.png", buffer);
            })
        })

    } catch (error) {
        // console.error(error.message);
    }
};