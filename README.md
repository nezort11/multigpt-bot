# Multi-gpt bot

## Pre setup

```sh
# Volta
curl https://get.volta.sh | bash

# Yandex cloud cli
curl -sSL https://storage.yandexcloud.net/yandexcloud-yc/install.sh | bash
yc --version
yc init
```

## Setup

```sh
nvm use 18
# or
volta install node@18

pnpm install
pnpm dev
```

Deploy to production

```sh
pnpm release
# or
pnpm build
pnpm serverless:deploy
pnpm serverless:info
pnpm webhook:set
```

Clear resource and reset

```sh
pnpm purge
pnpm webhook:remove
```
