```
   ___     ___     ___    _  _     ___              ___     ___    _  _    _____    ___     ___     _     
  / __|   | _ \   /   \  | \| |   |   \     o O O  / __|   | __|  | \| |  |_   _|  | _ \   /   \   | |    
 | (_ |   |   /   | - |  | .` |   | |) |   o      | (__    | _|   | .` |    | |    |   /   | - |   | |__  
  \___|   |_|_\   |_|_|  |_|\_|   |___/   TS__[O]  \___|   |___|  |_|\_|   _|_|_   |_|_\   |_|_|   |____| 
_|"""""|_|"""""|_|"""""|_|"""""|_|"""""| {======|_|"""""|_|"""""|_|"""""|_|"""""|_|"""""|_|"""""|_|"""""| 
"`-0-0-'"`-0-0-'"`-0-0-'"`-0-0-'"`-0-0-'./o--000'"`-0-0-'"`-0-0-'"`-0-0-'"`-0-0-'"`-0-0-'"`-0-0-'"`-0-0-' 
```
A microservice for publishing content to various media sources.

## Installation

Clone this repo and `npm install` in the root directory.

## Testing

Grand Central uses Jasmine for testing.  You can run `npm run test` to perform the whole test suite, or you can `npm install -g jasmine` to use Jasmine directly.

## SQS

Amazon SQS is the primary way to send content to Grand Central.  It is a message queue that Grand Central continually polls for new content.  This has the advantage of being very fail-safe; AWS is very reliable so even if Grand Central has a problem, other products such as Outpost can continue to push content and that content will *eventually* be published.  If Grand Central crashes on a piece of content, that content will still re-appear in the SQS queue so that Grand Central can try it again later when the issue has been worked out.  Because SQS is part of AWS, it's very easy to set up IAM users to add messages to Grand Central's queue.  If we decided to have other projects besides Outpost publish syndicated content, it would be trivial to create a new IAM user with its own access keys and permissions.  SQS also provides decent visibility into the current state of publishing as well as basic monitoring.

## Adapters

Adapters are modules that create a consistent interface between Grand Central and a given API.  Every adapter must have **GET**, **POST**, **PUT**, and **DELETE** functions, and every function should return an object with the bare-minimum of an HTTP status code and a message.  Even if the adapter doesn't actually work with a REST interface, or if a request can't be made, it still should return an HTTP status code and a message to consistently indicate the status of a request.  If a request was successful and returns some information like an ID or a revision, that information should also be included in the response object.

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