var express = require('express');
var router = express.Router();

const {Web3} = require('web3');
const fs = require('fs');
const path = require('path');
const {findTokenContractAddress , insertDB ,getTokenList, checkAddress , updateWalletInfo} = require('../mysql');
const { threadId } = require('worker_threads');
const { throws } = require('assert');

const axios = require('axios');
require('dotenv').config();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.post('/test2', function(req, res, next) {
  console.log("test2 체크" ,req.body);
  
  const sign = 'plus';
  const user_srl = req.body.user_srl;
  const token_name = req.body.token_name;
  const amount = 100;
  historyData = {
    token_name: 'BOB',
    user_id: 'thswhdals',
    from_address: '0x687087daFd0F7849e0Fe0992f474c5790e483B9d',
    to_address: '0x9EA65955f379c7D1aaf166E18a118847Bd7Ff2A3',
    amount: 100,
    usedFee: '0.000036776997903711',
    IsExternalTrade: 'no',
    transactionHash: '0xf32c0a3e812857cf93f2d361036135c27abf42f158ba96e13568715ce384069d'
  }
  var table = token_name+'_history'
  insertDB(table, historyData, (error, result)=>{
    if(error){
      throw error;
    }else{
      const sign = 'minus';
      const user_srl = req.body.user_srl;
      const token_name = req.body.token_name;
      const totalAmount = req.body.amount + finalCostEther;
      updateWalletInfo( sign, user_srl, token_name, amount, (result) => {
        console.log(result);
      });

      res.status(200).send(JSON.stringify({
        result: 'success',
        receipt: receipt,
      }, (key, value) => 
      // BigInt 값을 문자열로 변환
        typeof value === 'bigint' ? value.toString() : value 
      ));
    }
  });
  updateWalletInfo( sign, user_srl, token_name, amount, (result) => {
    console.log(result);
  });
});


router.post('/test', async function(req, res, next){
  const web3 = new Web3(new Web3.providers.HttpProvider(process.env.ALCHEMY_TESTNET_RPC_URL));
  const type = req.body.type;
  const myAddress = req.body.address;
  const token_name = req.body.token_name;

    //토큰 ABI 가져오기 
    const artifactPath = path.join(__dirname, '..','artifacts', 'contracts', `${token_name}.sol`, `${token_name}.json`);
    const ERC20_ABI = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    const tokenContractABI = ERC20_ABI.abi;

  
  const token_info = {
    token_name: token_name,
  };
  await findTokenContractAddress(token_info, async (error, results) => {
    if (error) {
      var data = {
        result: 'error', 
        msg: error,
      };
      callback(data);
    } else {
      const tokenContractAddress = results.deployContract;
      const tokenContract = new web3.eth.Contract(tokenContractABI, tokenContractAddress);
      if(type === "received"){
        // 받는 경우 확인
        const receivedEvents = await tokenContract.getPastEvents('Transfer', {
          filter: {to: myAddress}, // 수신자가 내 주소인 경우
          fromBlock: 0,
          toBlock: 'latest'
        });
        console.log("Received:", receivedEvents);

        res.status(200).send({
          result: 'success',
          data: receivedEvents
        })
      }else if(type === "send"){
        const events = await tokenContract.getPastEvents('Transfer', {
          filter: {from: myAddress}, // 발신자가 내 주소인 경우
          fromBlock: 0,
          toBlock: 'latest'
        });
        console.log("Sent:", events);
        res.status(200).send({
          result: 'success',
          data: events
        })
      }
    }
  });
});

router.post('/getTokenList', async function(req, res, next) {
  try {
    const user_srl = req.body.user_srl;
    console.log("getTokenList");
    console.log(user_srl);
    getTokenList(user_srl ,async (error, results) => {
      if(error){
        throw error;
      }
      console.log('getHaveCoin : ',results);
      res.status(200).send({ result: 'success', data: results});
    });
    
  } catch (error) {
    res.status(404).send({ result: 'error', msg: error});
  }

})

router.post('/api/etherscan/history', function(req, res, next){
  const API_KEY = process.env.ETHERSCAN_API_KEY;
  const address = '0x687087daFd0F7849e0Fe0992f474c5790e483B9d';
  const url = `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=asc&apikey=${API_KEY}`;
  // const url = `https://api-sepolia.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=asc&apikey=${API_KEY}`;
 console.log('url : ' + url);
  axios.get(url)
    .then(response => {
      const transactions = response.data.result;
      console.log('transactions : ' , transactions);
    })
    .catch(error => {
      console.error(error);
    });
})

//잔고 가져오기
router.post('/getBalance', async function(req, res, next) {
  try {
    const token_name= req.body.token_name;
    const user_address = req.body.address;
    await getTokenBalance(token_name, user_address, (results) => {
      if(results =="" || results == undefined || results == null) {
        res.status(200).send(
          {result: "success", balance: 0}
        )
      }
      res.status(200).send(
        {result: "success", balance: results}
      )
    });
  } catch (error) {
    res.status(500).send({result: "error", error: error})
  }
});


router.post('/sendETH/',async(req, res, next) => {
  try {
    
    console.log('sendETH: ', req.body);
    //체인 연결
    const web3 = new Web3(process.env.ALCHEMY_TESTNET_RPC_URL);
    //개인키관리

    const user_srl = req.body.user_srl;
    const user_id = req.body.user_id
    const keyPath = path.join(__dirname, '..',`user`,`${user_id}`,`privateKey`);
    const senderPrivateKey =fs.readFileSync(keyPath, 'utf8');
    //보내는사람 지갑주소
    const senderAddress = req.body.from_address; // 보내는 사람의 주소
    //받는사람 지갑주소
    const receiverAddress = req.body.to_address; // 받는 사람의 주소
    //보내는 수량
    const amount = web3.utils.toWei(req.body.amount, 'ether'); // 보낼 이더리움 양 (예: 0.1 ETH)
    // console.log('req.body.amount : ',req.body.amount);
    // console.log('amount : ',amount);

    const nonce = await web3.eth.getTransactionCount(senderAddress);
    const tx = {
      from: senderAddress,
      to: receiverAddress,
      value: amount,
      nonce: nonce,
      gasLimit: 30000, // 이더리움 전송 기본 가스 한도
      gasPrice: await web3.eth.getGasPrice(),
    };

    const signedTx = await web3.eth.accounts.signTransaction(tx, senderPrivateKey);
    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    console.log('Transaction receipt:', receipt);

    // 사용한 가스값 구하기
    const finalCost = receipt.gasUsed * receipt.effectiveGasPrice;
    const finalCostEther = Web3.utils.fromWei(finalCost.toString(), 'ether');

    //트랜잭션 해시
    const transactionHash = receipt.logs[0].transactionHash;

    const historyData = {
      token_name: token_name,
      user_srl: user_srl,
      user_id: user_id,
      from : senderAddress,
      to : receiverAddress,
      amount : req.body.amount,
      usedFee : finalCostEther,
      transactionHash: transactionHash,
    };
    // console.log('historyData :', historyData);

    await insertDB(token_name+'_history', historyData, (error, result)=>{
      if(error){
        throw error;
      }else{
        res.status(200).send(JSON.stringify({
          result: 'success',
          receipt: receipt,
        }, (key, value) => 
        // BigInt 값을 문자열로 변환
          typeof value === 'bigint' ? value.toString() : value 
        ));
      }
    });

  } catch (error) {
    res.status(500).send({
      result: 'fail',
      error : error,
    });
  }
});

//생성한 토큰 전송(확인 완료)
router.post('/sendToken', async (req, res) => {
  try {
    const web3 = new Web3(process.env.ALCHEMY_TESTNET_RPC_URL);

    const user_srl = req.body.user_srl;
    const user_id = req.body.user_id;
    const senderAddress = req.body.from_address;
    const receiverAddress = req.body.to_address;
    const token_name = req.body.token_name;
    const amount = web3.utils.toWei(req.body.amount, 'ether'); // 100 토큰
    const IsExternalTrade = await checkInternal(token_name , receiverAddress);
    console.log("IsExternalTrade: " , IsExternalTrade);

    //토큰 ABI 가져오기 
    const artifactPath = path.join(__dirname, '..','artifacts', 'contracts', `${token_name}.sol`, `${token_name}.json`);
    const ERC20_ABI = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

    const token_info = {
      token_name: token_name,
    };
    await findTokenContractAddress(token_info, async (error, results) => {
      if (error) {
        var data = {
          result: 'error', 
          msg: error,
        };
        callback(data);
      } else {
        
        const keyPath = path.join(__dirname, '..',`user`,`${user_id}`,`privateKey`);
        // const senderPrivateKey = 'sender-private-key';
        const senderPrivateKey =fs.readFileSync(keyPath, 'utf8');
        
        const tokenContractAddress = results.deployContract;
        const tokenContract = new web3.eth.Contract(ERC20_ABI.abi, tokenContractAddress);

        const nonce = await web3.eth.getTransactionCount(senderAddress);
        const tx = {
          token_name: token_name,
          from: senderAddress,
          to: tokenContractAddress,
          data: tokenContract.methods.transfer(receiverAddress, amount).encodeABI(),
          nonce: nonce,
          gasLimit: await tokenContract.methods.transfer(receiverAddress, amount).estimateGas({ from: senderAddress }),
          gasPrice: await web3.eth.getGasPrice(),
        };

        const signedTx = await web3.eth.accounts.signTransaction(tx, senderPrivateKey);
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

        console.log('Transaction receipt:', receipt);

        // 사용한 가스값 구하기
        const finalCost = receipt.gasUsed * receipt.effectiveGasPrice;
        const finalCostEther = Web3.utils.fromWei(finalCost.toString(), 'ether');

        //트랜잭션 해시
        const transactionHash = receipt.logs[0].transactionHash;

        const historyData = {
          token_name: token_name,
          user_srl: user_srl,
          user_id: user_id,
          from_address : senderAddress,
          to_address : receiverAddress,
          amount : req.body.amount,
          usedFee : finalCostEther,
          IsExternalTrade: IsExternalTrade,
          transactionHash: transactionHash,
        };
        console.log('historyData :', historyData);

        await insertDB(token_name+'_history', historyData, (error, result)=>{
          if(error){
            throw error;
          }else{
            const sign = 'minus';
            const user_srl = req.body.user_srl;
            const token_name = req.body.token_name;
            const totalAmount = req.body.amount + finalCostEther;
            updateWalletInfo( sign, user_srl, token_name, amount, (result) => {
              console.log(result);
            });

            res.status(200).send(JSON.stringify({
              result: 'success',
              receipt: receipt,
            }, (key, value) => 
            // BigInt 값을 문자열로 변환
              typeof value === 'bigint' ? value.toString() : value 
            ));
          }
        });


      }
    });
  
  } catch (error) {
    res.status(500).send({
      result: 'fail',
      error : error,
    });
  }
});




// 실시간 가스체크(미체크)
async function checkGasStatus(){
  const web3 = new Web3(process.env.ALCHEMY_TESTNET_RPC_URL);
  var gasPrice = await web3.eth.getGasPrice();
  var gasLimit = await tokenContract.methods.transfer(receiverAddress, amount).estimateGas({ from: senderAddress });

  return gasPrice * gasLimit;

}

//생성한 토큰 잔고 가져오기(확인)
async function getTokenBalance(token_name, user_address , callback) {
  const token_info = {
    token_name: token_name,
  };
  console.log(token_info);
  await findTokenContractAddress(token_info, async (error, results) => {
    if (error) {
      var data = {
        result: 'error',
        msg: error,
      };
      callback(data);
    } else {
  
      // 계약 주소 가져오기
      const TOKEN_ADDRESS = results.deployContract;
      // ABI 가져오기
      // const artifactPath = path.join(__dirname, '..','artifacts', 'contracts', `${token_name}.sol`, `${token_name}.json`);
      const artifactPath = path.join(__dirname, '..','artifacts', 'contracts',`${token_name}.json`);
      const ERC20_ABI = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

      const web3 = new Web3(process.env.ALCHEMY_TESTNET_RPC_URL);
      const tokenContract = new web3.eth.Contract(ERC20_ABI.abi, TOKEN_ADDRESS);
      const balance = await tokenContract.methods.balanceOf(user_address).call();
      // console.log('check: ',balance);
      const balanceEther = Web3.utils.fromWei(balance.toString(), 'ether');
      // console.log('balanceEther: ',balanceEther);
      // var data = {
      //   result: 'success',
      //   simbol: results.token_simbol,
      //   balance: balanceEther,
      // };
      callback(balanceEther);
      // console.log("Token Balance:", balanceEther);
    }}
  );
}

function checkInternal(token_name , to_address){
  return new Promise((resolve, reject) => { // Promise를 반환합니다.
    const checkForm = {
      token_name: token_name,
      to_address: to_address,
    };

    checkAddress(checkForm, (result) => {
      console.log('res: ', result);
      if (result.length > 0) {
        resolve("yes"); // 프로미스를 해결하고 "yes"를 반환합니다.
      } else {
        resolve("no"); // 프로미스를 해결하고 "no"를 반환합니다.
      }
    });
  });
}


module.exports = router;
