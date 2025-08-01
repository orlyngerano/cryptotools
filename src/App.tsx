import React, { use, useState } from 'react';
import { Button, Text, createTamagui, Input, Label, RadioGroup, SizableText, TamaguiProvider, TextArea, XStack, YStack } from 'tamagui'
import { defaultConfig } from '@tamagui/config/v4'
import { Mnemonic, Wallet } from 'ethers';
import './App.css';
import { Toast, ToastProvider, ToastViewport, useToastController, useToastState } from '@tamagui/toast';
import * as bitcoin from 'bitcoinjs-lib';
import ECPairFactory from 'ecpair';
import ecc from '@bitcoinerlab/secp256k1';
import bitcoinMessage from 'bitcoinjs-message'

// you usually export this from a tamagui.config.ts file
const config = createTamagui(defaultConfig)

type Conf = typeof config

// make imports typed
declare module '@tamagui/core' {
  interface TamaguiCustomConfig extends Conf { }
}


 const ECPair = ECPairFactory(ecc);

type CryptoType = "Ethereum"| "Bitcoin";

const useCreateWallet = () => {
  const [publicKey, setPublicKey] = useState('');
  const [address, setAddress] = useState('');
  const [signature, setSignature] = useState('');
  const [signMessage, setSignMessage] = useState<(message: string) => void>(() => (message: string) => { });


  const clear = () => {
    setPublicKey('');
    setAddress('');
    setSignature('');    
  }

  const create = (crypto: CryptoType) => {
    clear();
    if (crypto === 'Bitcoin') {
      const keyPair = ECPair.makeRandom();
      const publicKey = Array.from(keyPair.publicKey).map((byte) => byte.toString(16)).join('');
      setPublicKey(publicKey);
      const { address } = bitcoin.payments.p2wpkh({ pubkey: Buffer.from(keyPair.publicKey) });
      setAddress(address ||   '');

      setSignMessage(() => (message: string) => {
        if (!address || !keyPair.privateKey) {
          return
        }

        const signature = bitcoinMessage.sign(message, Buffer.from(keyPair.privateKey), keyPair.compressed, { segwitType: 'p2wpkh' });
        setSignature(signature.toString('base64'));
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
    }
  };

  return {
    publicKey,
    address,
    signature,
    create,
    signMessage
  };
}

function Hone() {
  const { publicKey, address, signature, create, signMessage } = useCreateWallet();
  const [message, setMessage] = useState('');
  const [crypto, setCrypto] = useState<CryptoType>("Ethereum" );
  const toast = useToastController();

  const handleCreateWallet = () => {
    setMessage('');
    create(crypto);
  };

  const handleCopy = (value: string) => {
    navigator.clipboard.writeText(value);
    toast.show('Copied to clipboard');
  }

  const handleSignMessage = () => {
    signMessage(message);
  }

  const handleOnChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(event.target.value);
  }

  const handleOnCryptoChange = (crypto: string) => {
    setCrypto(crypto as CryptoType);
  }

  return (
    <>
      <YStack gap="$1" padding="$3">
        <Label>Create Wallet</Label>
        <XStack gap="$2" alignItems="center" >
          <RadioGroup onValueChange={handleOnCryptoChange} aria-labelledby="Select Crypto" defaultValue={crypto} name="crypto">
            <XStack alignItems="center" gap="$3">
              <RadioGroupItemWithLabel value="Bitcoin" label="Bitcoin" />
              <RadioGroupItemWithLabel value="Ethereum" label="Ethereum" />
            </XStack>
          </RadioGroup>
          <Button theme="blue" onClick={handleCreateWallet}>Create</Button>
        </XStack>
        <Label>Address</Label>
        <XStack gap="$2">
          <Input theme="blue" id="address" flex={1} readOnly value={address} placeholder="address" size="$4" />
          <Button theme="blue" onClick={() => { handleCopy(address) }}>Copy</Button>
        </XStack>
        <Label>Public Key</Label>
        <XStack gap="$2">
          <Input theme="blue" id="publickey" flex={1} readOnly value={publicKey} placeholder="publicKey" size="$4" />
          <Button theme="blue" onClick={() => { handleCopy(publicKey) }}>Copy</Button>
        </XStack>
        <Label>Signing</Label>
        <XStack gap="$2">
          <TextArea
            onChange={handleOnChange}
            theme="blue"
            flex={1}
            placeholder="Enter your Message"
            value={message}
          />
          <YStack gap="$1">
            <Button theme="blue" onClick={handleSignMessage}>Sign</Button>
            <Button theme="blue" onClick={() => { handleCopy(message) }}>Copy</Button>
          </YStack>
        </XStack>

        <Label>Signature</Label>
        <XStack gap="$2">
          <Input theme="blue" id="signature" flex={1} readOnly value={signature} placeholder="signature" size="$4" />
          <Button theme="blue" onClick={() => { handleCopy(signature) }}>Copy</Button>
        </XStack>
      </YStack>

      <CurrentToast />
      <ToastViewport />
    </>
  );
}

const App = () => {
  return (
    <TamaguiProvider config={config}>
      <ToastProvider>
        <Hone />
      </ToastProvider>
    </TamaguiProvider>
  )
}

function RadioGroupItemWithLabel(props: {
  value: string
  label: string
}) {
  const id = `radiogroup-${props.value}`
  return (
    <XStack alignItems="center" space="$4">
      <RadioGroup.Item value={props.value} id={id}>
        <RadioGroup.Indicator />
      </RadioGroup.Item>
      <Label htmlFor={id}>
        {props.label}
      </Label>
    </XStack>
  )
}

const CurrentToast = () => {
  const currentToast = useToastState()

  if (!currentToast || currentToast.isHandledNatively) return null

  return (
    <Toast
      animation="200ms"
      key={currentToast.id}
      duration={currentToast.duration}
      enterStyle={{ opacity: 0, transform: [{ translateY: 100 }] }}
      exitStyle={{ opacity: 0, transform: [{ translateY: 100 }] }}
      transform={[{ translateY: 0 }]}
      opacity={1}
      scale={1}
      viewportName={currentToast.viewportName}

    >
      <YStack>
        <Toast.Title>{currentToast.title}</Toast.Title>
        {!!currentToast.message && (
          <Toast.Description>{currentToast.message}</Toast.Description>
        )}
      </YStack>
    </Toast>
  )
}

export default App;
