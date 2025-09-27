import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Colors } from '@/constants/theme';
import { useWallet, TransactionData } from '@/contexts/WalletContext';
import { useBle } from '@/contexts/BleContext';

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
  'Preparing and signing transaction...',
  'Scanning for nearby mesh nodes...',
  'Routing through offline network...',
  'Finding internet gateway...',
  'Broadcasting to blockchain network...',
  'Transaction confirmed on blockchain!',
];

interface TransactionLoaderProps {
  onComplete: (fullMessage?: string) => void;
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
  const { broadcastMessage, masterState } = useBle();
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [broadcastId, setBroadcastId] = useState<number | null>(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [shouldPauseFlow, setShouldPauseFlow] = useState(false);
  const [isWaitingForConfirmation, setIsWaitingForConfirmation] =
    useState(false);
  const [nextStepTimeouts, setNextStepTimeouts] = useState<
    ReturnType<typeof setTimeout>[]
  >([]);

  // Animation values
  const progressAnim = useRef(new Animated.Value(0)).current;
  const stepAnimations = useRef(
    TRANSACTION_STEPS.map(() => new Animated.Value(0))
  ).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Resume the transaction flow to the final step - ONLY when properly confirmed
  const resumeTransactionFlow = useCallback(() => {
    // STRICT: only resume if we have proper confirmation through BLE mesh network
    if (!broadcastId) {
      console.log(
        '⚠️ Cannot resume transaction flow: no broadcast ID - waiting for confirmation'
      );
      return;
    }

    const state = masterState.get(broadcastId);
    if (!state || !state.isComplete || !state.isAck) {
      console.log(
        '⚠️ Cannot resume transaction flow: invalid state - still waiting for confirmation',
        state
      );
      return;
    }

    console.log(
      '✅ Resuming transaction flow with CONFIRMED state from mesh network'
    );

    // Continue from gateway step through broadcasting to completion
    const resumeFromStep = 4; // Broadcasting Transaction step
    const finalStepIndex = TRANSACTION_STEPS.length - 1;

    // Animate through the remaining steps quickly
    let stepDelay = 0;
    for (let i = resumeFromStep; i <= finalStepIndex; i++) {
      setTimeout(() => {
        setCurrentStep(i);

        // Animate step activation
        Animated.timing(stepAnimations[i], {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();

        // Update progress bar
        Animated.timing(progressAnim, {
          toValue: (i + 1) / TRANSACTION_STEPS.length,
          duration: 500,
          useNativeDriver: false,
        }).start();

        setLoadingMessageIndex(Math.min(i, LOADING_MESSAGES.length - 1));

        // Complete the transaction at the final step
        if (i === finalStepIndex) {
          setTimeout(() => {
            setIsCompleted(true);
            setTimeout(() => {
              onComplete(state.fullMessage);
            }, 1500);
          }, 800);
        }
      }, stepDelay);

      stepDelay += 800; // 800ms between each step
    }
  }, [broadcastId, masterState, onComplete, stepAnimations, progressAnim]);

  useEffect(() => {
    resetAnimation();
    startTransactionFlow();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Monitor master state for transaction completion
  useEffect(() => {
    if (broadcastId && masterState.has(broadcastId)) {
      const state = masterState.get(broadcastId);
      if (state && state.isComplete && state.isAck) {
        // Transaction is complete and acknowledged - stop broadcasting
        setIsBroadcasting(false);
        setShouldPauseFlow(false);
        setIsWaitingForConfirmation(false);

        // Resume the flow to the final step
        resumeTransactionFlow();
      }
    }
  }, [masterState, broadcastId, resumeTransactionFlow]);

  // STRICT Safety check: prevent completion if still waiting for confirmation
  useEffect(() => {
    // ALWAYS prevent completion if we're waiting for confirmation OR if we haven't received proper mesh confirmation
    if ((isWaitingForConfirmation || currentStep >= 3) && isCompleted) {
      // Only allow completion if we have a confirmed broadcast state
      if (!broadcastId || !masterState.has(broadcastId)) {
        console.log(
          '⚠️ STRICT Safety check: Preventing completion - no confirmed mesh state'
        );
        setIsCompleted(false);
        return;
      }

      const state = masterState.get(broadcastId);
      if (!state || !state.isComplete || !state.isAck) {
        console.log(
          '⚠️ STRICT Safety check: Preventing completion - mesh confirmation not received'
        );
        setIsCompleted(false);
      }
    }
  }, [
    isWaitingForConfirmation,
    isCompleted,
    currentStep,
    broadcastId,
    masterState,
  ]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      nextStepTimeouts.forEach((timeout) => clearTimeout(timeout));
    };
  }, [nextStepTimeouts]);

  const resetAnimation = () => {
    setCurrentStep(0);
    setIsCompleted(false);
    setLoadingMessageIndex(0);
    setShouldPauseFlow(false);
    setIsWaitingForConfirmation(false);
    // Clear any pending timeouts
    nextStepTimeouts.forEach((timeout) => clearTimeout(timeout));
    setNextStepTimeouts([]);

    progressAnim.setValue(0);
    stepAnimations.forEach((anim) => anim.setValue(0));
    pulseAnim.setValue(1);
    fadeAnim.setValue(0);

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  // Get current loading message based on state
  const getCurrentLoadingMessage = (): string => {
    if (isCompleted) {
      return 'Transaction completed successfully!';
    }

    if (isWaitingForConfirmation || (isBroadcasting && shouldPauseFlow)) {
      if (broadcastId && masterState.has(broadcastId)) {
        const state = masterState.get(broadcastId);
        if (state?.isAck && !state?.isComplete) {
          return 'Received acknowledgment, waiting for final confirmation...';
        }
        if (state?.isComplete && state?.isAck) {
          return 'Transaction confirmed by mesh network! Finalizing...';
        }
        return 'Broadcasting transaction via mesh network...';
      }
      return 'Waiting for mesh network confirmation...';
    }

    // If we've reached the gateway step, always show waiting message
    if (currentStep >= 3) {
      return 'Found gateway device, waiting for mesh network confirmation...';
    }

    return LOADING_MESSAGES[loadingMessageIndex] || 'Processing...';
  };

  // Get chunk progress for display
  const getChunkProgress = useCallback((): {
    received: number;
    total: number;
  } => {
    if (broadcastId && masterState.has(broadcastId)) {
      const state = masterState.get(broadcastId);
      if (state) {
        const progress = {
          received: state.chunks.size,
          total: state.totalChunks || 1,
        };
        return progress;
      }
    }
    return { received: 0, total: 0 };
  }, [broadcastId, masterState]);

  // Check if we should show chunk progress (only after receiving is_ack flag)
  const shouldShowChunkProgress = useCallback((): boolean => {
    if (broadcastId && masterState.has(broadcastId)) {
      const state = masterState.get(broadcastId);
      return state?.isAck === true;
    }
    return false;
  }, [broadcastId, masterState]);

  // Function to sign the transaction
  const handleTransactionSigning = async () => {
    try {
      if (!transactionData) {
        console.log('❌ No transaction data provided');
        return;
      }

      // Use the user's wallet address from component level hook

      // Convert amount to wei (assuming amount is in ETH)
      const amountInWei = BigInt(
        Math.floor(parseFloat(transactionData.amount) * Math.pow(10, 18))
      );
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
      console.log(
        '🌐 Selected chain:',
        transactionData.chain,
        'Chain ID:',
        transactionData.chainId
      );
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
        gasPrice:
          '0x' + parseInt(txData.gasPrice || '20000000000').toString(16),
        nonce: '0x' + parseInt(txData.nonce || '0').toString(16),
        chainId: '0x' + txData?.chainId?.toString(16),
        data: txData.data || '0x',
        signature: {
          v: signedTransaction.v,
          r: signedTransaction.r,
          s: signedTransaction.s,
        },
      };

      console.log('Transaction Hash:', signedTransaction.transactionHash);
      console.log('Raw Transaction:', signedTransaction.rawTransaction);

      console.log('📋 LOCAL TRANSACTION PAYLOAD:');
      console.log(JSON.stringify(transactionPayload, null, 2));

      // Start broadcasting the transaction payload
      try {
        const payloadString = JSON.stringify(transactionPayload);
        await broadcastMessage(payloadString);
        setIsBroadcasting(true);
        setShouldPauseFlow(true); // Pause the flow here
        setIsWaitingForConfirmation(true); // Set waiting for confirmation

        // Find the broadcast ID from the master state
        // Since broadcastMessage creates a new entry, we need to find the latest one
        const states = Array.from(masterState.entries());
        const latestState = states.find(
          ([_, state]) => state.fullMessage === payloadString && !state.isAck
        );

        if (latestState) {
          setBroadcastId(latestState[0]);
          console.log(
            '🚀 Started broadcasting transaction with ID:',
            latestState[0]
          );
        }
      } catch (error) {
        console.error('❌ Error broadcasting transaction payload:', error);
        // Reset flags on error
        setIsBroadcasting(false);
        setShouldPauseFlow(false);
        setIsWaitingForConfirmation(false);
      }
    } catch (error) {
      console.error('❌ Error signing transaction:', error);
    }
  };

  const startTransactionFlow = async () => {
    let totalDuration = 0;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    TRANSACTION_STEPS.forEach((step, index) => {
      const timeout = setTimeout(async () => {
        // Check if we should pause the flow (happens at gateway step) or waiting for confirmation
        if ((shouldPauseFlow || isWaitingForConfirmation) && index >= 3) {
          // Stop at "Finding Internet Gateway" step (index 3) and wait for confirmation
          console.log(
            '🔄 Pausing transaction flow at step:',
            step.title,
            'waiting for confirmation...'
          );
          return; // Don't proceed to next steps
        }

        setCurrentStep(index);
        animateStep(index);

        if (index < LOADING_MESSAGES.length) {
          setLoadingMessageIndex(index);
        }

        // Sign the transaction during the "Preparing Transaction" step (step 0)
        if (index === 0) {
          await handleTransactionSigning();
        }

        // If this is the "Finding Internet Gateway" step, pause here and wait for confirmation
        if (index === 3) {
          setIsWaitingForConfirmation(true);
          setShouldPauseFlow(true);
          console.log(
            '🌐 Reached Finding Internet Gateway step - waiting for confirmation...'
          );
        }
      }, totalDuration);

      timeouts.push(timeout);
      totalDuration += step.duration;
    });

    // Store timeouts for cleanup
    setNextStepTimeouts(timeouts);

    // REMOVED: Automatic completion logic - now always waits for confirmation
    // The completion will ONLY be handled by the master state monitor after receiving confirmation
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

  const renderStep = (step: (typeof TRANSACTION_STEPS)[0], index: number) => {
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
            <Text
              style={[
                styles.stepIconText,
                isActive && styles.stepIconTextActive,
              ]}
            >
              {step.icon}
            </Text>
          </Animated.View>
          {index < TRANSACTION_STEPS.length - 1 && (
            <View
              style={[styles.stepLine, isCompleted && styles.stepLineCompleted]}
            />
          )}
        </View>
        <View style={styles.stepContent}>
          <Text style={[styles.stepTitle, isActive && styles.stepTitleActive]}>
            {step.title}
          </Text>
          <Text
            style={[
              styles.stepDescription,
              isActive && styles.stepDescriptionActive,
            ]}
          >
            {step.description}
          </Text>
        </View>
      </Animated.View>
    );
  };

  // Calculate progress width based on chunks or steps
  const getProgressValue = useCallback((): number => {
    // Only use chunk progress if we should show it (after receiving is_ack flag)
    if (shouldShowChunkProgress()) {
      const chunkProgress = getChunkProgress();
      if (chunkProgress.total > 0) {
        return chunkProgress.received / chunkProgress.total;
      }
    }
    // Otherwise use step progress
    return (currentStep + 1) / TRANSACTION_STEPS.length;
  }, [getChunkProgress, shouldShowChunkProgress, currentStep]);

  // Update progress bar animation based on chunk progress
  useEffect(() => {
    const progressValue = getProgressValue();
    Animated.timing(progressAnim, {
      toValue: progressValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [getProgressValue, progressAnim]);

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
                to {transactionData.toAddress.slice(0, 6)}...
                {transactionData.toAddress.slice(-4)}
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
            <Animated.View
              style={[styles.progressFill, { width: progressWidth }]}
            />
          </View>
          <Text style={styles.progressText}>
            {(() => {
              // Show chunk progress only after receiving is_ack flag
              if (shouldShowChunkProgress()) {
                const chunkProgress = getChunkProgress();
                if (chunkProgress.total > 0) {
                  return `${chunkProgress.received}/${chunkProgress.total}`;
                }
              }
              // Otherwise show step progress
              return `Step ${currentStep + 1} of ${TRANSACTION_STEPS.length}`;
            })()}
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
              {getCurrentLoadingMessage()}
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

// const { width, height } = Dimensions.get('window'); // Commented out as not used

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
