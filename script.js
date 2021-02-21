'use strict'

const map = {
    articleTitle: 'title',
    articleImages: 'images',
    articleVideoIDs: 'videos',
    articleAuthor: 'author',
    articleBody: 'body',
    isFeatured: 'featured',
    articleUnixEpoch: 'timestamp',
    articleDate: 'date',
}
const locations = {
    homepage: {
        General_Info: 'General Info',
        ASB: 'ASB News',
        District: 'District News',
    },
    bulletin: {
        Academics: 'Academics',
        Athletics: 'Athletics',
        Clubs: 'Clubs',
        Colleges: 'Colleges',
        Reference: 'Reference',
    },
    other: {
        Archive: 'Archived Articles',
    }
}

main()

const Main = document.querySelector('main')
const Canvas = document.createElement('canvas')
Canvas.ctx = Canvas.getContext('2d')

async function main() {
    if (window.location.pathname)
        show_article()

    let articles = await load(locations, true) // Get cached articles first; Update later
    update(locations)

    for (const article of Object.values(articles).sort((a, b) => b.timestamp - a.timestamp)) {
        article.Snippet = make_snippet(article)
        document
            .getElementById('category-' + article.category)
            .append(article.Snippet)
    }
    load(locations, false)

    Main.addEventListener('click', event => {
        if (event.target === Main) {
            Main.classList.remove('open')
            history.pushState({}, '', '/')
        }
    })
    
    Canvas.width = Canvas.height = 4
    Canvas.ctx.filter = 'saturate(1000%)'
}
async function show_article() {
    const [location_index, category_index, ...id_array] = atob(window.location.pathname.split('/')[2])
    const location = Object.keys(locations)[location_index]
    const category = Object.keys(locations[location])[category_index]
    const id = id_array.join('')
    const remote = await db(location + '/' + category + '/' + id)
    if(!remote) return false
    const article = article_from_remote(id, location, category, remote)
    for (const property of Object.values(map)) {
        const element = Main.querySelector('.' + property)
        if (!element) continue
        element.innerHTML = article[property]
    }
    Main.classList.add('open')
}
async function load(locations, local) {

    if (local && localStorage.getItem('cache'))
        return JSON.parse(localStorage.getItem('articles'))

    const articles = {}
    for (const location in locations) {
        const data = await db(location)
        for (const category in data) {
            for (const id in data[category]) {
                articles[id] = article_from_remote(id, location, category, data[category][id])
            }
        }
    }
    localStorage.setItem('cache', 'true')
    localStorage.setItem('articles', JSON.stringify(articles))
    return articles
}

function article_from_remote(id, location, category, remote) {
    const article = {
        id,
        location,
        category
    }
    for (const property in remote)
        article[map[property]] = remote[property]
    article.date = new Date(article.timestamp * 1000).toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
    })
    return article
}

async function db(path) {
    const response = await fetch(`https://arcadia-high-mobile.firebaseio.com/${path}.json`)
    const data = await response.json()
    return data
}

function update(locations) {
    for (const location in locations) {
        let Location = clone_template('location')
        Location.id = 'location-' + location
        Location.querySelector('h3').textContent = location
            //Location.hidden = location != 'homepage'

        for (const category in locations[location]) {
            let Category = clone_template('category')
            Category.id = 'category-' + category
            Category.querySelector('h4').innerHTML = locations[location][category]
            Location.append(Category)
        }
        document.body.append(Location)
    }
}

function make_snippet(article) {
    let Snippet = clone_template('snippet')
    Snippet.href = '/' +
        slugify(article.title) +
        '/' +
        btoa([
            Object.keys(locations).indexOf(article.location),
            Object.keys(locations[article.location]).indexOf(article.category),
            article.id,
        ].join(''))
    Snippet.classList.toggle('featured', article.featured)

    const Image = Snippet.querySelector('.image')
    if(article.images){
        Image.src = article.images[0]
        gradient_background(Snippet,Image)
    }else{
        Image.remove()
    }
    
    for (const attribute of['title'])
        Snippet.querySelector('.' + attribute).innerHTML = article[attribute]

    Snippet.addEventListener('click', event => {
        history.pushState({}, '', Snippet.href)
        show_article()
        event.preventDefault()
    })
    return Snippet
}

function gradient_background(element,image){
  image.crossOrigin = 'Anonymous';
  image.addEventListener('load',()=>{
    Canvas.ctx.drawImage(image,0,0,Canvas.width,Canvas.height)
    const data = Canvas.ctx.getImageData(0, 0, Canvas.width, Canvas.height).data
    let colors = []
    for(let i = 0; i < Canvas.width*Canvas.height*4; i+=4){
      colors.push(`rgba(${data[i+0]}, ${data[i+1]}, ${data[i+2]}, 0.1)`)
    }
    let gradients = Array(5).fill(0).map(
      _ => `radial-gradient(
        ${rand_corner()},
        ${rand_value(colors)},${rand_value(colors)},
        transparent)`
    )
    gradients.unshift(`radial-gradient(${rand_corner()},transparent,white)`)
    element.style.backgroundImage = gradients.join(',')
  })
}

function rand_value(array){
  return array[Math.floor(Math.random()*array.length)]
}
function rand_corner(){
  return 'circle at ' + rand_value(['top left','top right','bottom left','bottom right'])
}

function slugify(text) {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-') // Replace spaces with -
        .replace(/[^\w\-]+/g, '') // Remove all non-word chars
        .replace(/\-\-+/g, '-') // Replace multiple - with single -
        .replace(/^-+/, '') // Trim - from start of text
        .replace(/-+$/, ''); // Trim - from end of text
}

function clone_template(name) {
    return document.querySelector('.template-' + name)
        .content.cloneNode(true)
        .querySelector('*')
}
