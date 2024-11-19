# Shrub Lend

```
Node Version 20
```

## To run locally
1- `cp packages/app/dotenv.example packages/app/.env`

2- Run app stack
```
yarn contracts 
yarn app
yarn graph-node
```
or with overmind:
```
overmind s
```

3- Init wallets
```
yarn local-initialize
```

4- To run subgraph locally:
```
yarn subgraph
```


## FAQ
- If you run into this error, try [resetting your metamask account](https://medium.com/@thelasthash/solved-nonce-too-high-error-with-metamask-and-hardhat-adc66f092cd)
<p align="center">
  <img src="image.png" width="300">
</p>
