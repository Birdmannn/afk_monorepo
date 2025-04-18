import { NDKEvent } from '@nostr-dev-kit/ndk';
import { useAccount } from '@starknet-react/core';
import { useQueryClient } from '@tanstack/react-query';
import { useProfile } from 'afk_nostr_sdk';
// import { useAuth } from '../../store/auth';
import { useAuth } from 'afk_nostr_sdk';
import { Formik, FormikProps } from 'formik';
import { useMemo, useRef, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

import { Button, SquareInput, Text } from '../../components';
import { useStyles, useWaitConnection, useWindowDimensions } from '../../hooks';
import { DeployTokenFormValues, useCreateToken } from '../../hooks/launchpad/useCreateToken';
import { useToast, useWalletModal } from '../../hooks/modals';
import stylesheet from './styles';
import { TipSuccessModalProps } from '../TipSuccessModal';
import { Picker } from '@react-native-picker/picker';
import { BondingType, MetadataOnchain } from '../../types/keys';
import { numericValue } from '../../utils/format';
import { useTokenCreatedModal } from '../../hooks/modals/useTokenCreateModal';
import { LoadingSpinner } from '../../components/Loading';
import { byteArray } from 'starknet';
import { FormMetadata } from 'src/components/search/TokenCard/form-metadata';
import { FormMetadataChildren } from 'src/components/search/TokenCard/metadata-children';
import * as ImagePicker from 'expo-image-picker';
import { useFileUpload } from '../../hooks/api';

enum TypeCreate {
  LAUNCH,
  CREATE,
  CREATE_AND_LAUNCH,
}
export type FormTokenCreatedProps = {
  event?: NDKEvent;
  starknetAddress?: string;
  hide?: () => void;
  showSuccess?: (props: TipSuccessModalProps) => void;
  hideSuccess?: () => void;
  metadata?: MetadataOnchain;
};

type FormValues = DeployTokenFormValues;
export const FormLaunchToken: React.FC<FormTokenCreatedProps> = (props) => {
  const [loading, setLoading] = useState(false)
  const formikRef = useRef<FormikProps<FormValues>>(null);
  const { hide: hideTokenCreateModal } = useTokenCreatedModal();
  const walletModal = useWalletModal();
  const styles = useStyles(stylesheet);
  const publicKey = useAuth((state) => state.publicKey);
  const profile = useProfile({ publicKey });
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const account = useAccount();
  const [isOpenFormMetadata, setIsOpenFormMetadata] = useState(false);
  const waitConnection = useWaitConnection();
  const { deployToken, deployTokenAndLaunch, deployTokenAndLaunchWithMetadata } = useCreateToken();
  const [metadata, setMetadata] = useState<MetadataOnchain | undefined>(props?.metadata);

  const [video, setVideo] = useState<ImagePicker.ImagePickerAsset | any>();
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | undefined>();
  const fileUpload = useFileUpload();

  const [type, setType] = useState(TypeCreate.CREATE);
  const initialFormValues: FormValues = {
    name: '',
    symbol: '',
    bonding_type: BondingType.Linear,
    // ticker: '',
    initialSupply: undefined,
    contract_address_salt: new Date().getTime()?.toString(),
    recipient: account?.address,
    is_unruggable: false,
    creator_fee_percent: 0,
    creator_fee_destination: account?.address,

  };

  const onSubmitPress = (type: TypeCreate) => {
    setType(type);
    formikRef.current?.handleSubmit();
  };

  const validateForm = (values: FormValues) => {
    const errors = {} as Partial<FormValues>;
    // TODO: Do validation

    return errors;
  };

  const onFormSubmit = async (values: FormValues) => {
    try {
      console.log('onFormSubmit deploy');
      if (!account.address) {
        walletModal.show();
        const result = await waitConnection();
        if (!result) return;
      }

      if (!account || !account?.account) return;
      console.log('test deploy');

      if (!values?.symbol) {
        return showToast({ type: 'info', title: 'Add symbol' });
      } else if (!values?.name) {
        return showToast({ type: 'info', title: 'Add name' });
      }
      else if (!values?.initialSupply) {
        return showToast({ type: 'info', title: 'Initial supply required' });
      }

      let tx;
      setLoading(true)

      console.log('metadata', metadata)
      if (type == TypeCreate.CREATE) {
        const data: DeployTokenFormValues = {
          recipient: account?.address,
          // name: byteArray.byteArrayFromString(values.name),
          name: values.name,
          symbol: values.symbol,
          initialSupply: values?.initialSupply,
          contract_address_salt: values.contract_address_salt,
          is_unruggable: values.is_unruggable ?? false,
        };

        tx = await deployToken(account?.account, data).catch(err => {
          showToast({ type: 'error', title: err?.message || "Something went wrong" });
          setLoading(false)
        });


      } else {
        const data: DeployTokenFormValues = {
          recipient: account?.address,
          name: values.name,
          symbol: values.symbol,
          initialSupply: values?.initialSupply,
          contract_address_salt: values.contract_address_salt,
          is_unruggable: values.is_unruggable ?? false,
          bonding_type: values.bonding_type,
        };

        if (!metadata) {
          tx = await deployTokenAndLaunch(account?.account, data,).catch(err => {
            // showToast({ type: 'error', title: err?.message || "Something went wrong" });
            showToast({ type: 'error', title: "Something went wrong when deploy token and launch", description: err?.message || "Something went wrong" });

            setLoading(false)
          });
        } else {
          let imageUrl: string | undefined;

          if (image) {
            const result = await fileUpload.mutateAsync(image);
            if (result.data.url) imageUrl = result.data.url;
          }

          if (video) {
            const result = await fileUpload.mutateAsync(video);
            if (result.data.url) imageUrl = result.data.url;
          }

          console.log("imageUrl", imageUrl)
          const metadataPrepared = {
            ...metadata,
            url: imageUrl ?? "",
            nostr_event_id: metadata?.nostr_event_id,
            token_address: account?.address,
            twitter: metadata?.twitter,
            github: metadata?.github,
            telegram: metadata?.telegram,
            website: metadata?.website,
          }
          console.log("metadataPrepared", metadataPrepared)

          tx = await deployTokenAndLaunchWithMetadata(account?.account, data, metadataPrepared).catch(err => {
            // showToast({ type: 'error', title: err?.message || "Something went wrong" });
            showToast({ type: 'error', title: "Something went wrong when deploy token and launch", description: err?.message || "Something went wrong" });

            setLoading(false)
          });
        }


      }

      if (tx) {
        showToast({ type: 'success', title: 'Token launch created successfully' });
        hideTokenCreateModal?.()
        setLoading(false)
      }
    } catch (error) {

      showToast({ type: 'error', title: 'Failed to create token and launch' });
      setLoading(false)
    }

  };

  if (profile.isLoading) return null;

  const dimensions = useWindowDimensions();
  const isDesktop = useMemo(() => {
    return dimensions.width >= 1024;
  }, [dimensions]);

  return (
    <ScrollView
      automaticallyAdjustKeyboardInsets
      style={styles.container}
      contentContainerStyle={
        isDesktop ? styles.contentContainerDesktop : styles.contentContainerMobile
      }
    >
      <Formik
        innerRef={formikRef}
        initialValues={initialFormValues}
        onSubmit={onFormSubmit}
        validate={validateForm}
      >
        {({ handleChange, handleBlur, values, errors, setFieldValue }) => (
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                value={values.name}
                onChangeText={handleChange('name')}
                onBlur={handleBlur('name')}
                placeholder="AFK Token"
                style={styles.input}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Symbol</Text>
              <TextInput
                value={values.symbol}
                onChangeText={handleChange('symbol')}
                onBlur={handleBlur('symbol')}
                placeholder="AFK"
                style={styles.input}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Total Supply</Text>
              <TextInput
                // type="number"
                value={values.initialSupply?.toString()}
                onChangeText={(text) => setFieldValue("initialSupply", numericValue(text))}
                onBlur={handleBlur('initialSupply')}
                placeholder="100000"
                inputMode="numeric"
                keyboardType="numeric"
                style={styles.input}


              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Bonding Type</Text>
              <Picker
                selectedValue={values.bonding_type}
                onValueChange={(itemValue) => {
                  formikRef.current?.setFieldValue('bonding_type', Number(itemValue));
                }}
                style={styles.input}
              >
                {Object.keys(BondingType)
                  .filter((key) => isNaN(Number(key)))
                  .map((bonding) => (
                    <Picker.Item
                      key={bonding}
                      label={bonding}
                      value={BondingType[bonding as keyof typeof BondingType]}
                    />
                  ))}
              </Picker>
            </View>


            <View>
              <Button disabled={loading} 
              // variant="primary" 
              onPress={() => setIsOpenFormMetadata(!isOpenFormMetadata)}
              >
                {isOpenFormMetadata ? 'Close' : 'Add Metadata'}
              </Button>

              {isOpenFormMetadata && (
                <FormMetadataChildren
                  // token={token}
                  // launch={launch}
                  isModalVisibleProps={isOpenFormMetadata}
                  setIsModalVisibleProps={setIsOpenFormMetadata}
                  // imageProps={imageProps}
                  setMetadataProps={setMetadata}
                  metadataProps={metadata}
                  isHandleMetadata={false}
                  setImageProps={setImage}
                  setVideoProps={setVideo}
                />
              )}
            </View>

            <View
            style={styles.buttonContainer}
            >
              <Button disabled={loading} 
              style={{width: '30%'}}
              onPress={() => onSubmitPress(TypeCreate.CREATE)}>
                Create
                {loading && type == TypeCreate.CREATE &&
                  <LoadingSpinner size={14} />
                }
              </Button>

              <Button disabled={loading} variant="primary" onPress={() => onSubmitPress(TypeCreate.CREATE_AND_LAUNCH)}>
                Create & Launch
                {loading && type !== TypeCreate.CREATE &&
                  <LoadingSpinner size={14} />
                }
              </Button>
              <View style={styles.gap} />
            </View>

          </View>
        )}

      </Formik>
      <Text
        weight="semiBold"
        color="inputPlaceholder"
        fontSize={13}
        align="center"
        style={styles.comment}
      >
        Launch & pump the coins!
      </Text>
    </ScrollView>
  );
};
