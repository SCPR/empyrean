```
 _______   _____ ______   ________  ___    ___ ________  _______   ________  ________      
|\  ___ \ |\   _ \  _   \|\   __  \|\  \  /  /|\   __  \|\  ___ \ |\   __  \|\   ___  \    
\ \   __/|\ \  \\\__\ \  \ \  \|\  \ \  \/  / | \  \|\  \ \   __/|\ \  \|\  \ \  \\ \  \   
 \ \  \_|/_\ \  \\|__| \  \ \   ____\ \    / / \ \   _  _\ \  \_|/_\ \   __  \ \  \\ \  \  
  \ \  \_|\ \ \  \    \ \  \ \  \___|\/  /  /   \ \  \\  \\ \  \_|\ \ \  \ \  \ \  \\ \  \ 
   \ \_______\ \__\    \ \__\ \__\ __/  / /      \ \__\\ _\\ \_______\ \__\ \__\ \__\\ \__\
    \|_______|\|__|     \|__|\|__||\___/ /        \|__|\|__|\|_______|\|__|\|__|\|__| \|__|
                                  \|___|/                                                  
```
A microservice for publishing content to various media sources.

## Installation

Clone this repo and `npm install` in the root directory.

## Testing

Empyrean uses Jasmine for testing.  You can run `npm run test` to perform the whole test suite, or you can `npm install -g jasmine` to use Jasmine directly.

## Adapters

### Facebook

Facebook requires a **client_access_token** and a **page_access_token**.  Client access tokens last for 60 days before the user, which Empyrean represents when posting stories, so the token will have to be occasionally recreated.  The most practical way to create a token is to use **device code** authentication:

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