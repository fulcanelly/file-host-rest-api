#!/usr/bin/bash
source .env


jq -n \
  --arg MYSQL_ROOT_PASSWORD "$MYSQL_ROOT_PASSWORD" \
  --arg MYSQL_DATABASE "$MYSQL_DATABASE" \
  --arg MYSQL_HOST "$MYSQL_HOST" \
  --arg MYSQL_USER "$MYSQL_USER" \
  '{
        development: {
            username: $MYSQL_USER,
            password: $MYSQL_ROOT_PASSWORD,
            database: $MYSQL_DATABASE,
            host: $MYSQL_HOST,
            dialect: "mysql"

        }
    }' > config/config.json
