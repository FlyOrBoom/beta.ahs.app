'use strict'
main()

async function main(){
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
		// other: {
		//     Archive: 'Archived Articles',
		// }
	}
	let articles = await load(locations,true) // Get cached articles first; Update later
	update_nav(locations)
	for(const article of Object.values(articles)){
		article.Snippet = make_snippet(article)
		document
		  .getElementById('category-'+article.category)
		  .append(article.Snippet)
	}
}

async function load(locations, local=true){

	if (local && localStorage.getItem('cache'))
		return JSON.parse(localStorage.getItem('articles'))

	const articles = {}
	const map = {
		articleTitle: 'title',
		articleImages: 'images',
		articleVideoIDs: 'videos',
		articleAuthor: 'author',
		articleBody: 'body',
		isFeatured: 'featured',
		articleDate: 'date',
	}
	for(const location in locations){
		const response = await fetch(`https://arcadia-high-mobile.firebaseio.com/${location}.json`)
		let data = await response.json()
		for(const category in data){
			for(const id in data[category]){
				const article = {id, location, category}
				for(const property in data[category][id])
					article[map[property]] = data[category][id][property]
				articles[id] = article
			}
		}
	}
	localStorage.setItem('cache','true')
	localStorage.setItem('articles',JSON.stringify(articles))
	return articles
}

function update_nav(locations){
  const Nav = document.querySelector('nav')
  Nav.append(Location)
  for(const location in locations){
	let Location = clone_template('location')
	Location.id = 'location-'+location
	Location.querySelector('h3').textContent = location
	Location.hidden = location != 'homepage'
	for(const category in locations[location]){
	  let Category = clone_template('category')
	  Category.id = 'category-' + category
	  Category.querySelector('h4').innerHTML = locations[location][category]
	  Location.append(Category)
	}
	Nav.append(Location)
  }
}

function make_snippet(article){
	let Snippet = clone_template('snippet')
	Snippet.href = '#article-'+article.id
	Snippet.classList.toggle('featured',article.featured)
	if(article.images)
	  Snippet.querySelector('.image').src =
	  Snippet.querySelector('.blur').src = article.images[0]
	for(const attribute of ['title','body','date'])
		Snippet.querySelector('.'+attribute).innerHTML = article[attribute]
	return Snippet
}


function clone_template(name){
  return document.querySelector('.template-'+name)
	.content.cloneNode(true)
	.querySelector('*')
}