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

    for (const name of['image', 'blur']) {
        const element = Snippet.querySelector('.' + name)
        if (article.images)
            element.src = article.images[0]
        else
            element.hidden = true
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
