const ethers = require('ethers');

const addresses = {
    WBNB: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    BUSD: '0xe9e7cea3dedca5984780bafc599bd69add087d56',
    factory: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',
    router: '0x10ed43c718714eb63d5aa57b78b54704e256024e',
    recipient: ''
}

//First address of this mnemonic must have enough BNB to pay for tx fess

const privateKey = '';

const mygasPrice = ethers.utils.parseUnits('5', 'gwei');

const provider = new ethers.providers.WebSocketProvider('wss://muddy-young-frost.bsc.quiknode.pro/');
const wallet = new ethers.Wallet(privateKey);
const account = wallet.connect(provider);

const factory = new ethers.Contract(
    addresses.factory,
    ['event PairCreated(address indexed token0, address indexed token1, address pair, uint)'],
    account
);
const router = new ethers.Contract(
    addresses.router,
    [
        'function getAmountsOut(uint amountIn, address[] memory path) public view returns(uint[] memory amounts)',
        'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns(uint[] memory amounts)'
    ],
    account
);

const wbnb = new ethers.Contract(
    addresses.WBNB,
    [
        'function approve(address spender, uint amount) public returns(bool)',
    ],
    account
);

const valueToapprove = ethers.utils.parseUnits('0.1', 'ether');
const valueToapprove = ethers.utils.parseUnits('0.1', 'ether');
const init = async () => {
    const tx = await wbnb.approve(
        router.address,
        valueToapprove,
        {
            gasPrice: mygasPrice,
            gasLimit: '162445'
        }
    );
    const receipt = await tx.wait();
    console.log('Transaction receipt');
    console.log(receipt);
}

factory.on('PairCreated', async (token0, token1, pairAddress) => {

    //The quote currency needs to be WBNB (we will pay with WBNB)
    let tokenIn, tokenOut;
    if (token0 === addresses.WBNB) {
        tokenIn = token0;
        tokenOut = token1;
    }

    if (token1 == addresses.WBNB) {
        tokenIn = token1;
        tokenOut = token0;
    }

    //The quote currency is not WBNB
    if (typeof tokenIn === 'undefined') {
        return;
    }

    //We buy for 0.1 BNB of the new token
    //ethers was originally created for Ethereum, both also work for BSC
    //'ether' === 'bnb' on BSC

    const amountIn = ethers.utils.parseUnits('0.01', 'ether');
    const amounts = await router.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    //Our execution price will be a bit different, we need some flexbility
    const amountOutMin = amounts[1].sub(amounts[1].div(10));



    const tx = await router.swapExactTokensForTokens(
        amountIn,
        amountOutMin,
        [tokenIn, tokenOut],
        addresses.recipient,
        Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes from the current Unix time
        {
            gasPrice: mygasPrice,
            gasLimit: 162445
        }
    );

    const receipt = await tx.wait();
    console.log('Transaction receipt');
    console.log(receipt);
});

init();