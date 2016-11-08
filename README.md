redis-dashboard
================
redis-dashboard is a client dashboard for redis.

# 1. Building
### 1.1 Setting for manifest.yml
>if the file does not exist, you must create the file in the root directory. 

    applications:
    name: swift-portal
    command: node app.js
    buildpack: nodejs_buildpack
    env:
        CF_STAGING_TIMEOUT: 25
        CF_STARTUP_TIMEOUT: 15

### 1.2 Add the following code in node.js main javascript file(such as app.js)
    //Disables HTTPS / SSL / TLS checking across entire node.js environment
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

### 1.3 Setting for cloudfoundry.json
>if the file does not exist, you must create the file in the root directory.

    {
        "ignoreNodeModules": true
    }


# 2. Deploying
    cf login -a https://<api endpoint> --skip-ssl-validation
    cf push