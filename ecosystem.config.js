module.exports = {
    apps: [
        {
            name: 'ProductAPI',
            script: 'dist/Server.js',
            env: {
                NODE_ENV: 'development',
            },
            env_staging: {
                NODE_ENV: 'staging',
            },
            env_production: {
                NODE_ENV: 'production',
            },
            instances: "max",
            exec_mode: "cluster"
        },
        {
            name: 'ProductTasksRunner',
            script: 'dist/tasks/index.js',
            env: {
                NODE_ENV: 'development',
            },
            env_staging: {
                NODE_ENV: 'staging',
            },
            env_production: {
                NODE_ENV: 'production',
            },
        },
        {
            name: 'ProductDocumentation',
            script: 'docs-server.js',
            env: {
                NODE_ENV: 'development',
            },
            env_staging: {
                NODE_ENV: 'staging',
            },
            env_production: {
                NODE_ENV: 'production',
            },
        },
    ],
};
