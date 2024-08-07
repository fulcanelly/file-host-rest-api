### Requirements

jq, docker, docker-compose, openssl

### How to run 

1. Adjust config.js for your needs

2. Configure env file

```
cp .env.example .env 
```

3. If you changed something in env - you need to update `config/config.json` file for `sequelize-cli`

```
bin/gencfg.sh
```

4. Generate secret keys for JWT signing

```
openssl rand -base64 32 > secret/access_token.key
openssl rand -base64 32 > secret/refresh_token.key
```
5. Run docker

```
docker-compose -f docker-compose.dev.yml up
```


### Example use

#### Upload file
```bash
curl -F "file=@test.png" http://localhost:3000/file/upload \
     -H "Authorization: Bearer $TOKEN" | jq
```
#### Sign up 
```bash
curl -X POST http://localhost:3000/signup \
  -H "Content-Type: application/json" \
  -d '{"id": "+380939748644", "password": "sensitivepassword"}'
```
