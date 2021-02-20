main()

async function main(){
    ////////////////////////
    //// INITIALIZATION ////
    ////////////////////////

    const locations = {
      bulletin: {
          Academics: 'Academics',
          Athletics: 'Athletics',
          Clubs: 'Clubs',
          Colleges: 'Colleges',
          Reference: 'Reference',
      },
      homepage: {
          General_Info: 'General Info',
          ASB: 'ASB News',
          District: 'District News',
      },
      // other: {
        //     Archive: 'Archived Articles',
        // }
    }

    let articles = await load(remote = true)
}

async function load(remote){
    let articles = {}

    const map = {
        articleTitle: 'title',
        articleImages: 'images',
        articleVideoIDs: 'videos',
        articleAuthor: 'author',
        articleBody: 'body',
        isFeatured: 'feature',
        articleDate: 'date',
    }
 
    for (const location in locations){
        let data
        if (remote) {
            const response = await fetch(`https://arcadia-high-mobile.firebaseio.com/${location}.json`)
            data = await response.json()
            
            for(const category in data){
                for(const id in data[category]){
                    for(const property in data[category][id]){
                        data[category][id][map[property]] = data[category][id][property]
                        delete data[category][id][property]
            }}}

        } else {
            data = JSON.parse(localStorage.getItem(location))
        }
        articles[location] = data
    }
    return articles
}

