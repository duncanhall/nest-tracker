# nest-tracker

A scheduled lambda function for better performance tracking of your NEST pension.

### Build

The following `npm` command will create a `.zip` package for upload to AWS lambda.

```
npm run lambda:build -- -u {NEST_USERNAME} -p {NEST_PASSWORD} -r {AWS_REGION}
```

The `{NEST_USERNAME}` and `{NEST_PASSWORD}` values are the credentials you use when logging in to [www.nestpensions.org.uk](http://www.nestpensions.org.uk). These are written to `.env` file and bundled into the resulting `.zip`. They are never sent or stored anywhere else.

The `{AWS_REGION}` is the region your lambda function will be running in.
