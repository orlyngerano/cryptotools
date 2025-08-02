import React, { use, useState } from 'react';
import { Mnemonic, Wallet, verifyMessage } from 'ethers';
import './App.css';
import * as bitcoin from 'bitcoinjs-lib';
import ECPairFactory from 'ecpair';
import ecc from '@bitcoinerlab/secp256k1';
import bitcoinMessage from 'bitcoinjs-message'
import Button from '@mui/material/Button';
import { Box, Container, FormControl, FormControlLabel, FormLabel, IconButton, InputAdornment, InputLabel, OutlinedInput, Radio, RadioGroup, Snackbar, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import CopyAll from '@mui/icons-material/CopyAll';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import ErrorOutline from '@mui/icons-material/ErrorOutline';


const ECPair = ECPairFactory(ecc);

type CryptoType = "Ethereum" | "Bitcoin";
type WalletActionType = "Sign" | "Verify";
type NotifyPositionVertical = 'top' | 'bottom';
type NotifyPositionHorizontal = 'left' | 'center' | 'right';

const useCreateWallet = () => {
  const [publicKey, setPublicKey] = useState('');
  const [address, setAddress] = useState('');
  const [signature, setSignature] = useState('');
  const [signMessage, setSignMessage] = useState<(message: string) => void>(() => (message: string) => { });
  const [verifySignature, setVerifySignature] = useState<(message: string, signature: string) => void>(() => (message: string) => { });
  const [isVerificationValid, setVerificationValid] = useState<boolean | null>(null);

  const clear = () => {
    setPublicKey('');
    setAddress('');
    setSignature('');
    setVerificationValid(null);
  }

  const create = (crypto: CryptoType) => {
    clear();
    if (crypto === 'Bitcoin') {
      const keyPair = ECPair.makeRandom();
      const publicKey = Array.from(keyPair.publicKey).map((byte) => byte.toString(16)).join('');
      setPublicKey(publicKey);
      const { address } = bitcoin.payments.p2wpkh({ pubkey: Buffer.from(keyPair.publicKey) });
      setAddress(address || '');

      setSignMessage(() => (message: string) => {
        if (!address || !keyPair.privateKey) {
          return
        }

        const signature = bitcoinMessage.sign(message, Buffer.from(keyPair.privateKey), keyPair.compressed, { segwitType: 'p2wpkh' });
        setSignature(signature.toString('base64'));
      });

      setVerifySignature(() => (message: string, signature: string) => {
        if (!address || !keyPair.privateKey) {
          return
        }

        try {
          const isValid = bitcoinMessage.verify(message, address, signature);
          setVerificationValid(isValid);
        } catch (_) {
          setVerificationValid(false);
        }
      });

    } else if (crypto === 'Ethereum') {
      const randomBytes = window.crypto.getRandomValues(new Uint8Array(32));
      const mnemonic = Mnemonic.fromEntropy(randomBytes);
      const wallet = Wallet.fromPhrase(mnemonic.phrase);

      setPublicKey(wallet.publicKey);
      setAddress(wallet.address);
      setSignMessage(() => (message: string) => {
        if (!wallet) {
          return
        }



        const signature = wallet.signMessageSync(message);
        setSignature(signature);
      });


      setVerifySignature(() => (message: string, signature: string) => {
        if (!wallet) {
          return
        }
        try {
          const derivedAddress = verifyMessage(message, signature);
          setVerificationValid(derivedAddress === wallet.address);
        } catch (_) {
          setVerificationValid(false);
        }
      });


    }
  };



  return {
    publicKey,
    address,
    signature,
    create,
    signMessage,
    verifySignature,
    isVerificationValid,
    setSignature
  };
}

function Hone() {
  const { setSignature, publicKey, address, signature, create, signMessage, verifySignature, isVerificationValid } = useCreateWallet();
  const [message, setMessage] = useState('');
  const [crypto, setCrypto] = useState<CryptoType>("Ethereum");
  const [walletAction, setWalletAction] = useState<WalletActionType>("Sign");
  const [notify, setNotify] = useState({
    open: false,
    vertical: 'top' as NotifyPositionVertical,
    horizontal: 'center' as NotifyPositionHorizontal,
    text: ""
  });


  const handleCreateWallet = () => {
    setMessage('');
    create(crypto);
  };


  const handleOnChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(event.target.value);
  }

  const handleOnCryptoChange = (crypto: string) => {
    setCrypto(crypto as CryptoType);
  }

  const handleTabChange = (walletAction: string) => {
    setWalletAction(walletAction as WalletActionType);
  }

  const handleWalletAction = () => {
    if (walletAction === 'Sign') {
      signMessage(message);
    } else if (walletAction === 'Verify') {
      verifySignature(message, signature);
    }
  }

  const handleOnChangeSignture = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSignature(event.target.value);
  }

  let isSignatureVisible = false;
  let isSignatureCopyable = true;
  if (!!address && walletAction === 'Sign' && signature) {
    isSignatureVisible = true;
  } else if (walletAction === 'Verify') {
    isSignatureVisible = true;
    isSignatureCopyable = false;
  }

  const isVerificationNotifyVisible = isVerificationValid !== null;


  return (
    <Container maxWidth="sm">
      <Snackbar
        anchorOrigin={{ vertical: notify.vertical, horizontal: notify.horizontal }}
        open={notify.open}
        onClose={() => {
          setNotify({
            ...notify, open: false
          })
        }}
        message={notify.text}
        key={notify.vertical + notify.horizontal}
      />
      <Typography variant="h5" gutterBottom>
        Wallet
      </Typography>
      <Typography marginBottom={2} variant="body1" gutterBottom>
        Create In-Memory Wallet which can be use to <b>Sign Message</b> and <b>Verify Signature</b>.
      </Typography>
      <Stack direction="row"  >
        <FormControl>
          <FormLabel id="blockchain-group-label">Select Blockchain</FormLabel>
          <RadioGroup
            row
            aria-labelledby="blockchain-group-label"
            name="blockchain-group"
            onChange={(_, value) => handleOnCryptoChange(value)}
            value={crypto}
          >
            <FormControlLabel value="Bitcoin" control={<Radio />} label="Bitcoin" />
            <FormControlLabel value="Ethereum" control={<Radio />} label="Ethereum" />
          </RadioGroup>
        </FormControl>
        <Box textAlign="center" alignContent="center" flex={1}>
          <Button variant="contained" onClick={handleCreateWallet}>{publicKey ? 'Create New' : 'Create'}</Button>
        </Box>

      </Stack>

      <Box marginTop={3}>
        <FormControl disabled={!address} variant="outlined" fullWidth>
          <InputLabel htmlFor="wallet-address">Wallet Address</InputLabel>
          <OutlinedInput
            value={publicKey}
            readOnly
            id="wallet-address"
            type="text"
            endAdornment={
              <InputAdornment position="end">
                <IconButton
                  disabled={!address}
                  aria-label="copy address  "
                  onClick={() => {
                    setNotify({
                      text: "Copy Address",
                      open: true,
                      horizontal: 'center',
                      vertical: 'top'
                    })
                  }}
                  edge="end"
                >
                  <CopyAll />
                </IconButton>
              </InputAdornment>
            }
            label="Wallet Address"
          />
        </FormControl>
      </Box>

      <Box marginTop={3} borderBottom={1} borderColor="divider">
        <Tabs value={walletAction} onChange={(_, value) => handleTabChange(value)} aria-label="basic tabs example">
          <Tab label="Sign" value="Sign" />
          <Tab label="Verify" value="Verify" />
        </Tabs>
      </Box>
      <Stack spacing={2} marginTop={2}>
        <TextField
          disabled={!address}
          id="walletAction-text"
          label="Message"
          multiline
          rows={5}
          fullWidth
          value={message}
          onChange={handleOnChange}
        />

        {isSignatureVisible && <FormControl variant="outlined" fullWidth>
          <InputLabel htmlFor="wallet-address">Signature</InputLabel>
          <OutlinedInput
            onChange={handleOnChangeSignture}
            disabled={!address}
            value={signature}
            readOnly={walletAction === 'Sign'}
            id="signed-message"
            type="text"
            endAdornment={isSignatureCopyable &&
              <InputAdornment position="end">
                <IconButton
                  aria-label="copy signature"
                  onClick={() => {
                    setNotify({
                      text: "Copy Signature",
                      open: true,
                      horizontal: 'center',
                      vertical: 'top'
                    })
                  }}
                  edge="end"
                >
                  <CopyAll />
                </IconButton>
              </InputAdornment>
            }
            label="Wallet Address"
          />
        </FormControl>}

        <Stack direction="row" spacing={1}>
          {isVerificationNotifyVisible ? <>
            <Typography component="h5" color={isVerificationValid ? 'success' : 'error'}>
              Signature is {isVerificationValid ? 'valid' : 'invalid'}
            </Typography>
            {isVerificationValid ? <CheckCircleOutline color='success' /> : <ErrorOutline color='error' />}
          </> : null}
          <Box textAlign="end" flex={1}>
            <Button disabled={!address || !message} variant="contained" onClick={handleWalletAction}>
              {walletAction === "Sign" ? "Sign" : "Verify"}
            </Button>
          </Box>
        </Stack>





      </Stack>


    </Container>

  );
}

const App = () => {
  return (
    <Hone />
  )
}


export default App;
