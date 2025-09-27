import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Colors } from '@/constants/theme';
import { useWallet, TransactionData } from '@/contexts/WalletContext';

// Transaction Flow Steps - Easily editable constants
const TRANSACTION_STEPS = [
  {
    id: 1,
    title: 'Preparing Transaction',
    description: 'Encrypting transaction payload with Web3 cryptography',
    icon: '🔐',
    duration: 2000,
  },
  {
    id: 2,
    title: 'Scanning for Nearby Devices',
    description: 'Looking for Bluetooth-enabled devices in mesh network',
    icon: '📡',
    duration: 3000,
  },
  {
    id: 3,
    title: 'Hopping Through Network',
    description: 'Relaying encrypted payload through offline mesh nodes',
    icon: '🔄',
    duration: 4000,
  },
  {
    id: 4,
    title: 'Finding Internet Gateway',
    description: 'Locating device with active internet connection',
    icon: '🌐',
    duration: 3500,
  },
  {
    id: 5,
    title: 'Broadcasting Transaction',
    description: 'Submitting to blockchain network via gateway device',
    icon: '🚀',
    duration: 2500,
  },
  {
    id: 6,
    title: 'Transaction Confirmed',
    description: 'Successfully broadcasted to the blockchain',
    icon: '✅',
    duration: 1000,
  },
];

const LOADING_MESSAGES = [
  'Establishing secure connection...',
  'Routing through mesh network...',
  'Connecting to gateway node...',
  'Validating transaction...',
  'Broadcasting to blockchain...',
];

interface TransactionLoaderProps {
  onComplete: () => void;
  onCancel?: () => void;
  transactionData?: {
    amount: string;
    currency: string;
    toAddress: string;
    chain: string;
    chainId: number;
  };
}

export const TransactionLoader: React.FC<TransactionLoaderProps> = ({
  onComplete,
  onCancel,
  transactionData,
}) => {
  const { signTransaction, userWalletAddress } = useWallet();
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  // Animation values
  const progressAnim = useRef(new Animated.Value(0)).current;
  const stepAnimations = useRef(
    TRANSACTION_STEPS.map(() => new Animated.Value(0))
  ).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    resetAnimation();
    startTransactionFlow();
  }, []);

  const resetAnimation = () => {
    setCurrentStep(0);
    setIsCompleted(false);
    setLoadingMessageIndex(0);
    progressAnim.setValue(0);
    stepAnimations.forEach(anim => anim.setValue(0));
    pulseAnim.setValue(1);
    fadeAnim.setValue(0);

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  // Function to sign the transaction
  const handleTransactionSigning = async () => {
    try {
      if (!transactionData) {
        console.log('❌ No transaction data provided');
        return;
      }

      // Use the user's wallet address from component level hook

      // Convert amount to wei (assuming amount is in ETH)
      const amountInWei = BigInt(Math.floor(parseFloat(transactionData.amount) * Math.pow(10, 18)));
      const valueHex = '0x' + amountInWei.toString(16);

      // Create transaction data for signing
      const txData: TransactionData = {
        to: transactionData.toAddress,
        value: transactionData.amount,
        gasLimit: '21000',
        gasPrice: '20000000000', // 20 Gwei
        nonce: '0',
        chainId: transactionData.chainId, // Use selected chain ID
      };

      console.log('🔐 Signing transaction in TransactionLoader...');
      console.log('🌐 Selected chain:', transactionData.chain, 'Chain ID:', transactionData.chainId);
      console.log('💰 Selected currency:', transactionData.currency);
      console.log('📝 Transaction data:', txData);

      // Sign the transaction using the wallet context
      const signedTransaction = await signTransaction(txData);

      // Create the local transaction payload
      const transactionPayload = {
        from: userWalletAddress || '0x0000000000000000000000000000000000000000',
        to: transactionData.toAddress,
        value: valueHex,
        gas: '0x' + parseInt(txData.gasLimit || '21000').toString(16),
        gasPrice: '0x' + parseInt(txData.gasPrice || '20000000000').toString(16),
        nonce: '0x' + parseInt(txData.nonce || '0').toString(16),
        chainId: '0x' + txData.chainId.toString(16),
        data: txData.data || '0x',
        signature: {
          v: signedTransaction.v,
          r: signedTransaction.r,
          s: signedTransaction.s,
        }
      };

      console.log('✅ SIGNED TRANSACTION RESULT:');
      console.log('==================================');
      console.log('Transaction Hash:', signedTransaction.transactionHash);
      console.log('Raw Transaction:', signedTransaction.rawTransaction);
      console.log('==================================');

      console.log('📋 LOCAL TRANSACTION PAYLOAD:');
      console.log('==================================');
      console.log(JSON.stringify(transactionPayload, null, 2));
      console.log('==================================');

      // TODO: Send the transaction payload

    } catch (error) {
      console.error('❌ Error signing transaction:', error);
    }
  };

  const startTransactionFlow = async () => {
    let totalDuration = 0;

    TRANSACTION_STEPS.forEach((step, index) => {
      setTimeout(async () => {
        setCurrentStep(index);
        animateStep(index);
        
        if (index < LOADING_MESSAGES.length) {
          setLoadingMessageIndex(index);
        }

        // Sign the transaction during the "Preparing Transaction" step (step 0)
        if (index === 0) {
          await handleTransactionSigning();
        }
      }, totalDuration);

      totalDuration += step.duration;
    });

    // Complete the transaction
    setTimeout(() => {
      setIsCompleted(true);
      setTimeout(() => {
        onComplete();
      }, 1500);
    }, totalDuration);
  };

  const animateStep = (stepIndex: number) => {
    // Animate step activation
    Animated.timing(stepAnimations[stepIndex], {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Update progress bar
    Animated.timing(progressAnim, {
      toValue: (stepIndex + 1) / TRANSACTION_STEPS.length,
      duration: 800,
      useNativeDriver: false,
    }).start();

    // Pulse animation for current step
    const pulseAnimation = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (stepIndex === currentStep && !isCompleted) {
          pulseAnimation();
        }
      });
    };

    if (stepIndex < TRANSACTION_STEPS.length - 1) {
      pulseAnimation();
    }
  };

  const renderStep = (step: typeof TRANSACTION_STEPS[0], index: number) => {
    const isActive = index <= currentStep;
    const isCurrent = index === currentStep;
    const isCompleted = index < currentStep;

    const stepOpacity = stepAnimations[index];
    const stepScale = stepAnimations[index].interpolate({
      inputRange: [0, 1],
      outputRange: [0.8, 1],
    });

    return (
      <Animated.View
        key={step.id}
        style={[
          styles.stepContainer,
          {
            opacity: stepOpacity,
            transform: [{ scale: stepScale }],
          },
        ]}
      >
        <View style={styles.stepIconContainer}>
          <Animated.View
            style={[
              styles.stepIcon,
              isActive && styles.stepIconActive,
              isCompleted && styles.stepIconCompleted,
              isCurrent && {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <Text style={[styles.stepIconText, isActive && styles.stepIconTextActive]}>
              {step.icon}
            </Text>
          </Animated.View>
          {index < TRANSACTION_STEPS.length - 1 && (
            <View style={[styles.stepLine, isCompleted && styles.stepLineCompleted]} />
          )}
        </View>
        <View style={styles.stepContent}>
          <Text style={[styles.stepTitle, isActive && styles.stepTitleActive]}>
            {step.title}
          </Text>
          <Text style={[styles.stepDescription, isActive && styles.stepDescriptionActive]}>
            {step.description}
          </Text>
        </View>
      </Animated.View>
    );
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <SafeAreaView style={styles.fullPageContainer}>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        {/* Fixed Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Processing Transaction</Text>
          {transactionData && (
            <View style={styles.transactionInfo}>
              <Text style={styles.transactionText}>
                Sending {transactionData.amount} {transactionData.currency}
              </Text>
              <Text style={styles.transactionAddress}>
                to {transactionData.toAddress.slice(0, 6)}...{transactionData.toAddress.slice(-4)}
              </Text>
              <Text style={styles.transactionChain}>
                on {transactionData.chain}
              </Text>
            </View>
          )}
        </View>

        {/* Fixed Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
          </View>
          <Text style={styles.progressText}>
            Step {currentStep + 1} of {TRANSACTION_STEPS.length}
          </Text>
        </View>

        {/* Scrollable Content */}
        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Steps */}
          <View style={styles.stepsContainer}>
            {TRANSACTION_STEPS.map((step, index) => renderStep(step, index))}
          </View>

          {/* Loading Message */}
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingMessage}>
              {LOADING_MESSAGES[loadingMessageIndex] || 'Processing...'}
            </Text>
          </View>

          {/* Success State */}
          {isCompleted && (
            <Animated.View style={styles.successContainer}>
              <Text style={styles.successIcon}>🎉</Text>
              <Text style={styles.successText}>Transaction Successful!</Text>
            </Animated.View>
          )}
        </ScrollView>

        {/* Fixed Cancel Button */}
        {onCancel && !isCompleted && (
          <View style={styles.fixedFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>Cancel Transaction</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </SafeAreaView>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  fullPageContainer: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 10,
  },
  transactionInfo: {
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    width: '100%',
  },
  transactionText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  transactionAddress: {
    fontSize: 14,
    color: Colors.light.icon,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  transactionChain: {
    fontSize: 12,
    color: Colors.light.icon,
    marginTop: 2,
  },
  progressContainer: {
    marginBottom: 25,
    paddingHorizontal: 20,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.light.tint,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: Colors.light.icon,
    textAlign: 'center',
    marginTop: 8,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  stepsContainer: {
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  stepContainer: {
    flexDirection: 'row',
    marginBottom: 25,
    paddingHorizontal: 10,
  },
  stepIconContainer: {
    alignItems: 'center',
    marginRight: 15,
  },
  stepIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  stepIconActive: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
  },
  stepIconCompleted: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  stepIconText: {
    fontSize: 22,
  },
  stepIconTextActive: {
    color: 'white',
  },
  stepLine: {
    width: 3,
    height: 40,
    backgroundColor: '#e0e0e0',
    marginTop: 8,
  },
  stepLineCompleted: {
    backgroundColor: '#4CAF50',
  },
  stepContent: {
    flex: 1,
    justifyContent: 'center',
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginBottom: 4,
  },
  stepTitleActive: {
    color: Colors.light.text,
  },
  stepDescription: {
    fontSize: 14,
    color: '#bbb',
    lineHeight: 18,
  },
  stepDescriptionActive: {
    color: Colors.light.icon,
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  loadingMessage: {
    fontSize: 14,
    color: Colors.light.tint,
    fontStyle: 'italic',
  },
  fixedFooter: {
    padding: 20,
    backgroundColor: Colors.light.background,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.icon,
  },
  cancelButtonText: {
    color: Colors.light.icon,
    fontSize: 14,
    fontWeight: '500',
  },
  successContainer: {
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  successIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  successText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
});
