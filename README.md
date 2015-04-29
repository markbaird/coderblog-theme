# CoderBlog Theme
A Theme for PencilBlue

See it in action [here](https://www.codeammo.com)

## Features
- Responsive design using [Bootstrap](http://getbootstrap.com/)
- Syntax highlighting using [Highlight.js](https://github.com/isagalaev/highlight.js)
- SEO optimization using [Schema.org](http://schema.org/) [JSON-LD](http://json-ld.org/) structured data for [Blog](https://schema.org/Blog) and [Article](https://schema.org/Article) data 
    - Generated JSON-LD structures have been tested and validated in Google's [structured data testing tool](https://developers.google.com/structured-data/testing-tool/)
- [Disqus](https://disqus.com/) comments ready, just add the [PencilBlue Disqus plugin](https://github.com/pencilblue/disqus-pencilblue).
- Article listing by tags (topics)
- Pagination on all article lists
 
## Plugin Settings
- Header tagline
    - An optional tagline that will display below your site's name in the header
- Homepage SEO keywords
    - Keywords to use for SEO purposes on your site's homepage
- Homepage SEO description
    - A description of your site, to use for SEO purposes on your site's homepage
- Author LinkedIn URL
    - The URL of your LinkedIn profile page, used in SEO tags and in the author profile at the bottom of articles.
- Author StackOverflow URL
    - The URL of your StackOverflow profile page, used in SEO tags and in the author profile at the bottom of articles.
- Author GitHub URL
    - The URL of your GitHub profile page, used in SEO tags and in the author profile at the bottom of articles. 
           
## Instructions
- Be sure to set all your user info under **Users | Manage | User | Personal Info**         
- Under **Site settings | Content**
    - Enable timestamps
    - Enable all Author display settings
- To enable Disqus comments:
    - Download, install and configure the [PencilBlue Disqus plugin](https://github.com/pencilblue/disqus-pencilblue)
    - Uncomment the Disqus comment directives in the following files:
    ```
    /templates/index.html
    /templates/elements/article_full.html
    ```