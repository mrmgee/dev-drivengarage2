const path = require("path");
const Image = require('@11ty/eleventy-img');

const sizesResp = "(min-width: 930px) 932px, 100vw";

const imageShortcode = async (
  src,
  alt,
  classVar,
  sizesResp,
  widths = [400, 800, 1280],
  formats = ['jpeg'],
  sizes = '(min-width: 768px) 600px, 100vw'
//   sizes = '(min-width: 930px) 932px, 100vw'
) => {
    const imageMetadata = await Image(src, {
        widths: [...widths, null],
        formats: [...formats, null],
        filenameFormat: function (hash, src, width, format, options) {
            const { name } = path.parse(src);
            return `${name}-${width}.${format}`;
        },
        outputDir: '_site/assets/images',
        urlPath: '/assets/images',
        sizes: sizesResp,
      });

      if (classVar === undefined) {
        imageAttributesTemp = {
            alt,
            sizes,
            loading: "lazy",
            decoding: "async",
        };
      } else {
         imageAttributesTemp = {
            class: classVar,
            alt,
            sizes,
            loading: "lazy",
            decoding: "async",
        };
        }
        imageAttributes = imageAttributesTemp;

    
      return Image.generateHTML(imageMetadata, imageAttributes);
      
};



// gallery shortcode function
const sharp = require('sharp');


const GALLERY_IMAGE_WIDTH = 400;
const LANDSCAPE_LIGHTBOX_IMAGE_WIDTH = 1200;   //orig 2000 width
const PORTRAIT_LIGHTBOX_IMAGE_WIDTH = 720;

async function galleryImageShortcode(src, alt) {
    let lightboxImageWidth = LANDSCAPE_LIGHTBOX_IMAGE_WIDTH;

    const metadata = await sharp(src).metadata();
    if (metadata.orientation > 1) {
        console.log('Rotated image detected:', src, metadata.orientation);
        await sharp(src).rotate().toFile(`correct/${src.split("/").pop()}`);
    }

    if(metadata.height > metadata.width) {
        lightboxImageWidth = PORTRAIT_LIGHTBOX_IMAGE_WIDTH;
    }

    const options = {
        formats: ['jpeg'],
        widths: [GALLERY_IMAGE_WIDTH, lightboxImageWidth],
        filenameFormat: function (hash, src, widths, formats, options) {
            const { name } = path.parse(src);
            return `${name}-${widths}.${formats}`;
        },
        urlPath: "/gallery/",
        outputDir: './_site/gallery/'
    }

    const genMetadata = await Image(src, options);

    return `
        <a class="myClass12" href="${genMetadata.jpeg[1].url}" 
        data-pswp-width="${genMetadata.jpeg[1].width}" 
        data-pswp-height="${genMetadata.jpeg[1].height}" 
        target="_blank">
            <img src="${genMetadata.jpeg[0].url}" alt="${alt}" />
            <span class="hidden-caption-content">${alt}</span>
            <div class="control">
              <img src="/_images/i-link-arr.png" alt="Link to more">
            </div>
        </a>
    `.replace(/(\r\n|\n|\r)/gm, "");;
}




// gallery shortcode
function galleryShortcode(content, name) {
    return `
            <div class="gallery container" id="gallery-${name}">
                <div class="columns is-multiline">
                ${content}
                </div><!-- END columns -->
            </div>
            <script type="module">
            import PhotoSwipeLightbox from '/_js/photoswipe-lightbox.esm.js';
            const options = {
              gallery:'#gallery-${name}',
              children:'a',
              pswpModule: () => import('/_js/photoswipe.esm.js')
            };
            const lightbox = new PhotoSwipeLightbox(options);
            lightbox.on('uiRegister', function() {
              lightbox.pswp.ui.registerElement({
                name: 'custom-caption',
                order: 9,
                isButton: false,
                appendTo: 'root',
                html: 'Caption text',
                onInit: (el, pswp) => {
                  lightbox.pswp.on('change', () => {
                    const currSlideElement = lightbox.pswp.currSlide.data.element;
                    let captionHTML = '';
                    if (currSlideElement) {
                      const hiddenCaption = currSlideElement.querySelector('.hidden-caption-content');
                      if (hiddenCaption) {

                        captionHTML = hiddenCaption.innerHTML;
                      } else {
   
                        captionHTML = currSlideElement.querySelector('img').getAttribute('alt');
                      }
                    }
                    el.innerHTML = captionHTML || '';
                  });
                }
              });
            });
            lightbox.init();
            </script>
    `.replace(/(\r\n|\n|\r)/gm, "");
}





module.exports = function (eleventyConfig) {
    // Carpetas que añade directamente al directorio de salida
    // eleventyConfig.addPassthroughCopy("src/_css");
    const eleventyNavigationPlugin = require("@11ty/eleventy-navigation");
    
    eleventyConfig.addPlugin(eleventyNavigationPlugin);
    eleventyConfig.addPassthroughCopy("src/_images");
    eleventyConfig.addPassthroughCopy("src/_js");
    eleventyConfig.addPassthroughCopy("src/_css/swiffy-slider.min.css");
    eleventyConfig.addPassthroughCopy("src/_css/photoswipe.css");
    eleventyConfig.addPassthroughCopy("htaccess");

    // Flaticon icon font
    eleventyConfig.addPassthroughCopy("src/_css/flaticon/flaticon.css");
    

    // Install and use PhotoSwipe
    eleventyConfig.addPassthroughCopy({
        "./node_modules/photoswipe/dist/photoswipe.esm.js": "/_js/photoswipe.esm.js",
        "./node_modules/photoswipe/dist/photoswipe-lightbox.esm.js": "/_js/photoswipe-lightbox.esm.js",
        "./node_modules/photoswipe/dist/photoswipe.css": "/_css/photoswipe.css"
    });

    // Image plugin and shortcode
    eleventyConfig.addNunjucksAsyncShortcode("image", imageShortcode);

    // Create links to all pages in dir
    eleventyConfig.addCollection("postsFolder", function(collectionApi) {
        return collectionApi.getFilteredByGlob("**/services/*.md").sort(function(a, b) {
            //return a.date - b.date; // sort by date - ascending
            return b.date - a.date; // sort by date - descending
        });
    });

    // gallery and shortcode   
    eleventyConfig.addPairedNunjucksShortcode('gallery', galleryShortcode);
    eleventyConfig.addNunjucksAsyncShortcode('galleryImage', galleryImageShortcode);


    //Cache busting CSS files
    eleventyConfig.addFilter("bust", (url) => {
        const [urlPart, paramPart] = url.split("?");
        const params = new URLSearchParams(paramPart || "");
        params.set("v", DateTime.local().toFormat("X"));
        return `${urlPart}?${params}`;
    });


    

    // Custom collection
    eleventyConfig.addCollection('tagsList', (collectionApi) => {
        const tagsSet = new Set()
        collectionApi.getAll().forEach((item) => {
          if (!item.data.tags) return
          item.data.tags.forEach((tag) => tagsSet.add(tag))
        })
        return tagsSet
      })


    /* --- ADS --- */
    eleventyConfig.addNunjucksShortcode("topIndexAd", function() {
        return ``
    })

    eleventyConfig.addNunjucksShortcode("topPostAd", function() {
        return ``
    })

    eleventyConfig.addNunjucksShortcode("bottomImagePostAd", function() {
        return ``
    })

    eleventyConfig.addNunjucksShortcode("bottomContentPostAd", function() {
        return ``
    })

    eleventyConfig.addNunjucksShortcode("topPostMinimalAd", function() {
        return ``
    })

    eleventyConfig.addNunjucksShortcode("bottomContentPostMinimalAd", function() {
        return ``
    })
    /* --- ./ADS --- */


    /* --- Social Icons --- */
    eleventyConfig.addNunjucksShortcode("facebookDarkIcon", function() {
        return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9.19795 21.5H13.198V13.4901H16.8021L17.198 9.50977H13.198V7.5C13.198 6.94772 13.6457 6.5 14.198 6.5H17.198V2.5H14.198C11.4365 2.5 9.19795 4.73858 9.19795 7.5V9.50977H7.19795L6.80206 13.4901H9.19795V21.5Z" fill="#666666" /></svg>`
    })
    eleventyConfig.addNunjucksShortcode("facebookLightIcon", function() {
        return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9.19795 21.5H13.198V13.4901H16.8021L17.198 9.50977H13.198V7.5C13.198 6.94772 13.6457 6.5 14.198 6.5H17.198V2.5H14.198C11.4365 2.5 9.19795 4.73858 9.19795 7.5V9.50977H7.19795L6.80206 13.4901H9.19795V21.5Z" fill="#ffffff" /></svg>`
    })
    eleventyConfig.addNunjucksShortcode("instagramLightIcon", function() {
        return `<svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" width="1em" height="1em" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24"><g fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M7.465 1.066C8.638 1.012 9.012 1 12 1c2.988 0 3.362.013 4.534.066c1.172.053 1.972.24 2.672.511c.733.277 1.398.71 1.948 1.27c.56.549.992 1.213 1.268 1.947c.272.7.458 1.5.512 2.67C22.988 8.639 23 9.013 23 12c0 2.988-.013 3.362-.066 4.535c-.053 1.17-.24 1.97-.512 2.67a5.396 5.396 0 0 1-1.268 1.949c-.55.56-1.215.992-1.948 1.268c-.7.272-1.5.458-2.67.512c-1.174.054-1.548.066-4.536.066c-2.988 0-3.362-.013-4.535-.066c-1.17-.053-1.97-.24-2.67-.512a5.397 5.397 0 0 1-1.949-1.268a5.392 5.392 0 0 1-1.269-1.948c-.271-.7-.457-1.5-.511-2.67C1.012 15.361 1 14.987 1 12c0-2.988.013-3.362.066-4.534c.053-1.172.24-1.972.511-2.672a5.396 5.396 0 0 1 1.27-1.948a5.392 5.392 0 0 1 1.947-1.269c.7-.271 1.5-.457 2.67-.511zm8.98 1.98c-1.16-.053-1.508-.064-4.445-.064c-2.937 0-3.285.011-4.445.064c-1.073.049-1.655.228-2.043.379c-.513.2-.88.437-1.265.822a3.412 3.412 0 0 0-.822 1.265c-.151.388-.33.97-.379 2.043c-.053 1.16-.064 1.508-.064 4.445c0 2.937.011 3.285.064 4.445c.049 1.073.228 1.655.379 2.043c.176.477.457.91.822 1.265c.355.365.788.646 1.265.822c.388.151.97.33 2.043.379c1.16.053 1.507.064 4.445.064c2.938 0 3.285-.011 4.445-.064c1.073-.049 1.655-.228 2.043-.379c.513-.2.88-.437 1.265-.822c.365-.355.646-.788.822-1.265c.151-.388.33-.97.379-2.043c.053-1.16.064-1.508.064-4.445c0-2.937-.011-3.285-.064-4.445c-.049-1.073-.228-1.655-.379-2.043c-.2-.513-.437-.88-.822-1.265a3.413 3.413 0 0 0-1.265-.822c-.388-.151-.97-.33-2.043-.379zm-5.85 12.345a3.669 3.669 0 0 0 4-5.986a3.67 3.67 0 1 0-4 5.986zM8.002 8.002a5.654 5.654 0 1 1 7.996 7.996a5.654 5.654 0 0 1-7.996-7.996zm10.906-.814a1.337 1.337 0 1 0-1.89-1.89a1.337 1.337 0 0 0 1.89 1.89z" fill="#ffffff"/></g></svg>`
    })
    eleventyConfig.addNunjucksShortcode("instagramDarkIcon", function() {
        return `<svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" width="1em" height="1em" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24"><g fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M7.465 1.066C8.638 1.012 9.012 1 12 1c2.988 0 3.362.013 4.534.066c1.172.053 1.972.24 2.672.511c.733.277 1.398.71 1.948 1.27c.56.549.992 1.213 1.268 1.947c.272.7.458 1.5.512 2.67C22.988 8.639 23 9.013 23 12c0 2.988-.013 3.362-.066 4.535c-.053 1.17-.24 1.97-.512 2.67a5.396 5.396 0 0 1-1.268 1.949c-.55.56-1.215.992-1.948 1.268c-.7.272-1.5.458-2.67.512c-1.174.054-1.548.066-4.536.066c-2.988 0-3.362-.013-4.535-.066c-1.17-.053-1.97-.24-2.67-.512a5.397 5.397 0 0 1-1.949-1.268a5.392 5.392 0 0 1-1.269-1.948c-.271-.7-.457-1.5-.511-2.67C1.012 15.361 1 14.987 1 12c0-2.988.013-3.362.066-4.534c.053-1.172.24-1.972.511-2.672a5.396 5.396 0 0 1 1.27-1.948a5.392 5.392 0 0 1 1.947-1.269c.7-.271 1.5-.457 2.67-.511zm8.98 1.98c-1.16-.053-1.508-.064-4.445-.064c-2.937 0-3.285.011-4.445.064c-1.073.049-1.655.228-2.043.379c-.513.2-.88.437-1.265.822a3.412 3.412 0 0 0-.822 1.265c-.151.388-.33.97-.379 2.043c-.053 1.16-.064 1.508-.064 4.445c0 2.937.011 3.285.064 4.445c.049 1.073.228 1.655.379 2.043c.176.477.457.91.822 1.265c.355.365.788.646 1.265.822c.388.151.97.33 2.043.379c1.16.053 1.507.064 4.445.064c2.938 0 3.285-.011 4.445-.064c1.073-.049 1.655-.228 2.043-.379c.513-.2.88-.437 1.265-.822c.365-.355.646-.788.822-1.265c.151-.388.33-.97.379-2.043c.053-1.16.064-1.508.064-4.445c0-2.937-.011-3.285-.064-4.445c-.049-1.073-.228-1.655-.379-2.043c-.2-.513-.437-.88-.822-1.265a3.413 3.413 0 0 0-1.265-.822c-.388-.151-.97-.33-2.043-.379zm-5.85 12.345a3.669 3.669 0 0 0 4-5.986a3.67 3.67 0 1 0-4 5.986zM8.002 8.002a5.654 5.654 0 1 1 7.996 7.996a5.654 5.654 0 0 1-7.996-7.996zm10.906-.814a1.337 1.337 0 1 0-1.89-1.89a1.337 1.337 0 0 0 1.89 1.89z" fill="#666666"/></g></svg>`
    })
    /* --- Social Icons --- */



    // Formato de Fecha
    const { DateTime } = require("luxon");
    eleventyConfig.addFilter("postDate", (dateObj) => {
    return DateTime.fromJSDate(dateObj).setLocale('en-US').setZone("America/Los_Angeles").toLocaleString(DateTime.DATE_SHORT);
    });


    // Número de caracteres para Card  orig:70
    eleventyConfig.addFilter('descriptionLength', function(text) {
        let resultado
        text === undefined ? resultado = '' : resultado = String(text).split(" ").splice(0,32).join(" ") + ' ...';
        return resultado
    });

    //Order Post by Date
    eleventyConfig.addCollection("orderByDate", function(collectionApi) {
        return collectionApi.getAll().sort(function(a, b) {
        //   return b.date - a.date;
        });
    });



    // Get only content that matches a tag
    eleventyConfig.addCollection("myPosts", function(collectionApi) {
        return collectionApi.getFilteredByTag("blog").sort(function(a, b) {
            return b.date - a.date;
          });
    });





    // Artículos relacionados  - related
    eleventyConfig.addFilter('relacionados', function(collection, etiquetas, path, limite) {

        const filtrados = new Set();

        collection.map(item => {
            for (etiqueta of etiquetas) {
                // console.log(item.data.tags.length)
                if (item.data.tags && item.data.tags.includes(etiqueta)) {
                    filtrados.add(item)
                }
            }
        })

        // Eliminar Post Actual
        for (item of filtrados) {
            if (item.data.page.inputPath == path) {
                filtrados.delete(item)
            }
        }

        // Limitar el número de Articulos y que sean aleatorios
        let articulosFiltrados = Array.from(filtrados)
        if(articulosFiltrados.length <= limite) {
            return articulosFiltrados
        }

        do {
            let indice = Math.floor(Math.random()*articulosFiltrados.length)
            articulosFiltrados.splice((indice - 1), 1)

        } while (articulosFiltrados.length > limite)

        return articulosFiltrados

    })


    // Clean-css
    const CleanCSS = require("clean-css");
    eleventyConfig.addFilter("cssmin", function (code) {
        return new CleanCSS({}).minify(code).styles;
    });

    // PurgeCss
    const purgeCssPlugin = require("eleventy-plugin-purgecss");
    if (process.env.ELEVENTY_ENV === "production") {
        eleventyConfig.addPlugin(purgeCssPlugin, {
            // Optional: Specify the location of your PurgeCSS config
            config: "./purgecss.config.js",
            // Optional: Set quiet: true to suppress terminal output
            quiet: false,
        });
    }

    // Inline JS
    const { minify } = require("terser");
    eleventyConfig.addNunjucksAsyncFilter("jsmin", async function (
    code,
    callback
    ) {
    try {
        const minified = await minify(code);
        callback(null, minified.code);
    } catch (err) {
        console.error("Terser error: ", err);
        // Fail gracefully.
        callback(null, code);
    }
    });

    // Minify Html
    const htmlmin = require("html-minifier");

    if (process.env.ELEVENTY_ENV === "production") {
        eleventyConfig.addTransform("htmlmin", function (content, outputPath) {
            // Eleventy 1.0+: use this.inputPath and this.outputPath instead
            if (outputPath && outputPath.endsWith(".html")) {
                let minified = htmlmin.minify(content, {
                    useShortDoctype: true,
                    removeComments: true,
                    collapseWhitespace: true
                });
                return minified;
            }
            return content;
        });
    }

    // Estructura de directorios
    return {
        dir: {
            input: './src',
            data: '../_data',
            includes: '../_includes'
        }
    }
}
