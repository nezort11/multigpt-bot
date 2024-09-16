#!/usr/bin/env zsh

set -a
source .env
set +a

# Store the output of the "pnpm serverless info" command in a variable
output=$(pnpm serverless:info 2>&1 > /dev/null)

# Use grep to extract the URL value
url=$(echo $output | grep -o 'https://.*apigw.yandexcloud.net/')

# Append "/webhook" to the URL value
webhook_url="${url}webhook"

echo "Setting webhook url to $webhook_url"

# Execute the "pnpm set-webhook" command with the extracted URL value
pnpm telegraf -m setWebhook -t $BOT_TOKEN_PROD -D "{ \"url\": \"$webhook_url\" }"
