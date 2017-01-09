```
            ___     ___     ___    _  _     ___             ___     ___    _  _    _____    ___     ___     _     
    o O O  / __|   | _ \   /   \  | \| |   |   \           / __|   | __|  | \| |  |_   _|  | _ \   /   \   | |    
   o      | (_ |   |   /   | - |  | .` |   | |) |         | (__    | _|   | .` |    | |    |   /   | - |   | |__  
  TT__[O]  \___|   |_|_\   |_|_|  |_|\_|   |___/           \___|   |___|  |_|\_|   _|_|_   |_|_\   |_|_|   |____| 
 {======|_|"""""|_|"""""|_|"""""|_|"""""|_|"""""|_|"""""|_|"""""|_|"""""|_|"""""|_|"""""|_|"""""|_|"""""|_|"""""| 
./o--000'"`-0-0-'"`-0-0-'"`-0-0-'"`-0-0-'"`-0-0-'"`-0-0-'"`-0-0-'"`-0-0-'"`-0-0-'"`-0-0-'"`-0-0-'"`-0-0-'"`-0-0-' 
```
A microservice for publishing content to various media sources.

## Prerequisites

- Node.js >= v5.0.0
- NPM >= 3.10.0

## Installation

Create a new project directory by cloning this repo.  This gives you a deployable project that you can add your own API keys to as well as custom API adapters.

Then run `npm install` to pull in dependencies.

## Testing

Grand Central uses Jasmine for testing.  You can run `npm run test` to perform the whole test suite, or you can `npm install -g jasmine` to use Jasmine directly.

## SQS

Amazon SQS is the primary way to send content to Grand Central.  It is a message queue that Grand Central continually polls for new content.  This has the advantage of being very fail-safe; AWS is very reliable so even if Grand Central has a problem, other products such as Outpost can continue to push content and that content will *eventually* be published.  If Grand Central crashes on a piece of content, that content will still re-appear in the SQS queue so that Grand Central can try it again later when the issue has been worked out.  Because SQS is part of AWS, it's very easy to set up IAM users to add messages to Grand Central's queue.  If we decided to have other projects besides Outpost publish syndicated content, it would be trivial to create a new IAM user with its own access keys and permissions.  SQS also provides decent visibility into the current state of publishing as well as basic monitoring.

See `schemae/message.yml` for information on what properties an SQS message should have. 

## Adapters

Adapters are modules that create a consistent interface between Grand Central and a given API.  Every adapter must have **GET**, **POST**, **PUT**, and **DELETE** functions that return promises, and every promise callback should be given an object with the bare-minimum of an HTTP status code and a message.  Even if the adapter doesn't actually work with a REST interface, or if a request can't be made, it still should return an HTTP status code and a message to consistently indicate the status of a request.  If a request was successful and returns some information like an ID or a revision, that information should also be included in the response object.

Promises from adapter functions should always resolve unless there is an actual runtime error.  Errors coming in from an API response, or validation errors, should still resolve and errors should be represented as HTTP response codes.

### Facebook

Facebook requires a **client_access_token** and a **page_access_token**.  Client access tokens last for 60 days before the user, which Grand Central represents when posting stories, so the token will have to be occasionally recreated.  The most practical way to create a token is to use **device code** authentication:

1. Create a **user_code**.   

   `https://graph.facebook.com/v2.6/device/login?access_token=<APP_ID>|<CLIENT_TOKEN>&scope=pages_manage_cta,publish_pages,publish_actions,manage_pages,pages_manage_instant_articles,pages_show_list`   

   The APP_ID and CLIENT_TOKEN can be found in the app settings in Facebook.

2. Enter the returned **user_code** manually at `https://facebook.com/devices`.

3. Retrieve the **client_access_token** using the **code** returned in the earlier request.

   `https://graph.facebook.com/v2.6/device/login_status?access_token=<APP_ID>|<CLIENT_TOKEN>&code=<ODE>`

4. Query the ID for your Facebook account:

   `https://graph.facebook.com/me?access_token=<CLIENT_ACCESS_TOKEN>`

5. Finally, get the **page_access_token** under the object key for the specific page you want to post to:

   `https://graph.facebook.com/<USER_ID>/accounts?access_token=<CLIENT_ACCESS_TOKEN>`

For now, in `secrets.yml`, store the **page_access_token** under adapters.facebook.clientAccessToken.

There's probably a way to get a longer lasting token(or to renew one), but I've not yet figured that part out.

### Syndication Notes

Some syndications, such as Facebook Instant Articles, require a canonical URL to the content.  This means that, if you were to select Facebook as an adapter, the `link` property for the article you are sending must contain a link object with the canonical URL as the href.  If the server that is hosting your content at its canonical URL is not treated as a syndication(i.e. receives content by other means outside of Grand Central) and always sends messages to Grand Central, this shouldn't be a problem.  On the other hand, if you are treating your content server as a syndication, and you are syndicating to a provider that requires a canonical URL, it is necessary to first syndicate to only your content server and then have that server send syndication messages to Grand Central with the created canonical URL.

The steps would look similar to this:

1) CMS => SQS => Grand Central => Content Server (Content Server successfully saves content available at a canonical URL).
2) Content Server => SQS => Grand Central => Syndication (e.g. Facebook)

For your Content Server to know which adapters to syndicate to, I suggest adding a comma-separated list of adapters to a MessageAttribute on the original message between the CMS and the Content Server.  It is your choice what to name this attribute as you will have to write your content server to handle this message.  

Remember that you should only have to do this if you are publishing to somewhere that requires a canonical URL.  A push notification, for example, may not require this.

## Schemae

Grand Central uses JSON schemas to validate the information it receives.  There are currently separate schemae to validate SQS message properties, the body content(i.e. article JSON), and "links" within the body content.  The schemae are stored as YAML files under the `schemae` directory.  While `lib/grand-central.js` is responsible for validating the SQS message properties, each adapter is responsible for validating the content JSON.

## Development & Debugging

A `console` command provides a REPL for development.  `npm run console` will bring it up.  A global `gc` object is provided so you can inspect every part of Grand Central and manually call functions.

An easy way to run tests in debug mode is to use `npm run debug-test`, which will run Jasmine tests bug with Node debugging enabled(meaning execution will pause at breakpoints).

Though Grand Central will create its own local database in development, it is recommended that you use [PouchDB Server](https://github.com/pouchdb/pouchdb-server) or [CouchDB](https://github.com/apache/couchdb) so you can then use Fauxton and have better visibility into the contents of the database.


