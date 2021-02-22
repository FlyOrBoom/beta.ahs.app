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
const categories = [ 
	'homepage/General_Info', 
	'homepage/ASB', 
	'homepage/District', 
	'bulletin/Academics', 
	'bulletin/Athletics', 
	'bulletin/Clubs', 
	'bulletin/Colleges', 
	'bulletin/Reference', 
	'other/Archive' 
]

const Main = document.querySelector('main')
const Canvas = document.createElement('canvas')
Canvas.ctx = Canvas.getContext('2d')

main()

async function main() {
	show_article()
	load(true)
		.then(update_snippets)
		.then(load)
		.then(update_snippets)

	Main.addEventListener('click', event => {
		if (event.target !== Main) return
		close_article()
		history.pushState({}, '', '/')
	})

	window.addEventListener('popstate', show_article)
	Canvas.width = Canvas.height = 1
	Canvas.ctx.filter = 'saturate(1000%)'
}
async function close_article() {
	Main.classList.remove('open')
}
async function show_article() {
	if(window.location.pathname==='/') return close_article()
	const [index, ...id_array] = atob(window.location.pathname.split('/')[2])
	const [location,category] = categories[index].split('/')
	const id = id_array.join('')
	let article
	if (localStorage.getItem('cache')) {
		article = JSON.parse(localStorage.getItem('articles'))[id]
	} else {
		const remote = await db(location,category,id)
		if (!remote) return false
		article = article_from_remote(remote.data,...remote.path)
	}
	for (const property of Object.values(map)) {
		const element = Main.querySelector('.' + property)
		if (!element) continue
		element.innerHTML = article[property]
	}
	Main.classList.add('open')
}
async function load(local) {
	if (local && localStorage.getItem('cache'))
		return JSON.parse(localStorage.getItem('articles'))

	const articles = {}
	for await (const {data,path} of categories.map(path=>db(...path.split('/'))))
		for (const id in data)
			articles[id] = article_from_remote(data[id],...path,id)

	localStorage.setItem('cache', 'true')
	localStorage.setItem('articles', JSON.stringify(articles))
	return articles
}

function article_from_remote(remote,location,category,id) {
	const article = { location, category, id }
	for (const property in remote)
		article[map[property]] = remote[property]
	article.date = new Date(article.timestamp * 1000).toLocaleDateString(undefined, {
		weekday: 'long',
		month: 'long',
		day: 'numeric'
	})
	return article
}

async function db(...path) {
	const response = await fetch(`https://arcadia-high-mobile.firebaseio.com/${path.join('/')}.json`)
	const data = await response.json()
	return { data, path }
}

async function update_snippets(articles) {
	const caches = categories.map(()=>[])
	for await (const { article, Snippet } of
		Object.values(articles)
		.sort((a, b) => b.timestamp - a.timestamp)
		.map(make_snippet))
		caches[categories.indexOf(article.location+'/'+article.category)].push(Snippet)

	for (const [index,cache] of caches.entries()){
		const [ ,category] = categories[index].split('/')
		document.getElementById('category-'+category).querySelector('.carousel').append(...cache)
	}
}
async function make_snippet(article) {
	let Snippet = clone_template('snippet')
	Snippet.href = '/' +
		slugify(article.title) +
		'/' +
		btoa(
			categories.indexOf(article.location+'/'+article.category)
			+article.id
		)
	Snippet.classList.toggle('featured', article.featured)
	const Image = Snippet.querySelector('.image')
	if (article.images) {
		Image.src = article.images[0]
		gradient_background(Snippet, Image)
	} else {
		Image.remove()
	}

	for (const attribute of ['title'])
		Snippet.querySelector('.' + attribute).innerHTML = article[attribute]

	Snippet.addEventListener('click', event => {
		history.pushState({}, '', Snippet.href)
		show_article()
		event.preventDefault()
	})
	return { article, Snippet }
}

async function gradient_background(element, image) {
	image.crossOrigin = 'Anonymous'
	image.addEventListener('load', () => {
		Canvas.ctx.drawImage(image, 0, 0, 1, 1)
		const data = Canvas.ctx.getImageData(0, 0, 1, 1).data
		let color = `rgba(${data[0]}, ${data[1]}, ${data[2]}, 0.2)`
		let gradients = `
			radial-gradient(circle at 100% 100%,${color},transparent),
			radial-gradient(circle at 0% 0%,transparent,white)
		`
		element.style.backgroundImage = gradients
	})
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