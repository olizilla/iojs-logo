const winston = require('winston')
winston.remove(winston.transports.Console);
winston.add(winston.transports.Console, {timestamp:true})
if (!process.env.GH_KEY) winston.warn('No GH_KEY found in ENV. You may be throttled')

const github = require('octonode')
const client = github.client(process.env.GH_KEY);
const issue = client.issue('iojs/io.js', 37)
const http = require('http')
const ecstatic = require('ecstatic')({ root: __dirname + '/public' })
const isImage = /(!\[.*?\]\()(.+?)(\))/g
const excludedImages = [
  'http://nodeforward.org/node-forward.png',
  'http://www.crewpatches.com/images/patch_nasa_vector_ii_240x240.jpg',
  'https://m1.behance.net/rendition/modules/14539849/disp/0a5204aa473b5d26fc0efed400fe83ce.jpg',
  'https://m1.behance.net/rendition/modules/14539847/disp/7c8850a73c420ec3bc30d361e65a5751.jpg',
  'http://www.galacticvoyager.com/collect/nasaworm330.jpg',
  'https://cloud.githubusercontent.com/assets/4780756/5292274/8891edee-7b57-11e4-8358-3d27dbf057f2.jpg',
  'https://cloud.githubusercontent.com/assets/254782/5296489/b8144ea2-7ba4-11e4-811b-bb7a45319497.jpg',
  'https://i.imgur.com/i4NYFhA.gif',
  'https://s3.amazonaws.com/f.cl.ly/items/2v0N3c0A3P3s3Q3x3D30/not-google-io.jpg',
  'https://cloud.githubusercontent.com/assets/58871/5309797/7a49a626-7c21-11e4-8d1b-a44ebfc45da5.png',
  'http://fisica.cab.cnea.gov.ar/estadistica/abramson/celestia/gallery/slides/Io-Jupiter.jpg'
];

var logos = [{
  url: 'https://camo.githubusercontent.com/f64eb2e8e06a5b3921076a117d9084811c7ffca8/687474703a2f2f736372617463682e737562737461636b2e6e65742f696f6a732e7376673f31',
  comment:{
    url: 'https://github.com/iojs/io.js/issues/37',
    body: 'Let\'s all make some logos!'
  },
  user:{
    login: 'substack',
    avatar_url: 'https://avatars1.githubusercontent.com/u/12631?v=3&s=400',
    html_url: 'https://github.com/substack'
  }
}]

init()

function init () {
  winston.info('Fetching logos from GitHub')

  getLogos(function (err, res) {
    if (err) return winston.error(err)
    logos = [logos[0]].concat(res)
  })

  initServer()

  setInterval(function(){
    winston.debug('Checking for moar...')
    getLogos(function (err, res) {
      if (err) return winston.error(err)
      // rebuild the list. Keep the first one, as it's not in the commments but the issue.
      logos = [logos[0]].concat(res)
    })
  }, 60000)
}

function initServer () {
  var port = process.env.PORT || 8080

  http.createServer(function (req, res) {
    winston.info(req.method, req.url, req.headers['referer'], req.headers['user-agent'])
    if (req.url === '/data') {
      res.writeHead(200, {'Content-Type': 'application/json'});
      return res.end(JSON.stringify(logos));
    } else {
      ecstatic(req, res)
    }
  }).listen(port);

  winston.info('Server ready, listening on :' + port);
}

function getLogos (done) { getLogosByPage(1, [], done) }

// pluck all the logos from all the comments on the issue
function getLogosByPage (page, logos, done) {
  page = page || 1
  issue.comments({page: page, per_page: 100}, function(err, comments){
    if (err) return done(err, logos)
    if (!comments.length) return done(null, logos)

    var res = comments.map(extractLogos).reduce(flatten, [])
    winston.debug('Got ' + res.length +  ' logos from page ' + page)
    logos = logos.concat(res)
    getLogosByPage(page + 1, logos, done)
  })
}

function flatten(a, b) {return a.concat(b)}

function extractLogos (comment) {
  var res = []
  pullImageUrlsFromMarkdown(comment.body).forEach(function(url){
    // winston.info(comment)
    res.push({
      url: url,
      comment:{
        body: comment.body,
        url: comment.html_url
      },
      user: {
        login: comment.user.login,
        avatar_url: comment.user.avatar_url,
        html_url: comment.user.html_url,
      }
    })
  })
  return res
}

function pullImageUrlsFromMarkdown (md) {
  var urls = []
  var match = isImage.exec(md)
  while (match !== null) {
    if (excludedImages.indexOf(match[2]) === -1 ) {
      urls.push(match[2])
    }
    match = isImage.exec(md)
  }
  return urls
}
