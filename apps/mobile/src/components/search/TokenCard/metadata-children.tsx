import { NDKEvent, NDKUserProfile } from '@nostr-dev-kit/ndk';
import { useNavigation } from '@react-navigation/native';
import { useAccount } from '@starknet-react/core';
import { useProfile } from 'afk_nostr_sdk';
import * as Clipboard from 'expo-clipboard';
import { ImageSourcePropType, Image, Pressable, TextInput, TouchableOpacity, View, ScrollView } from 'react-native';

import { CopyIconStack, GalleryIcon, VideoIcon } from '../../../assets/icons';
import { useStyles, useTheme, useWaitConnection } from '../../../hooks';
import { useToast } from '../../../hooks/modals';
import { MainStackNavigationProps } from '../../../types';
import { MetadataOnchain, TokenDeployInterface, TokenLaunchInterface } from '../../../types/keys';
import { feltToAddress } from '../../../utils/format';
import { Button, Icon, Modal } from '../..';
import { Text } from '../../Text';
import stylesheet from './styles';
import { useLaunchToken } from '../../../hooks/launchpad/useLaunchToken';
import { AddLiquidityForm } from '../../AddLiquidityForm';
import { useModal } from '../../../hooks/modals/useModal';
import { useState } from 'react';
import { getElapsedTimeStringFull } from '../../../utils/timestamp';
import { useMetadataLaunch } from '../../../hooks/launchpad/useMetadataLaunch';
import * as ImagePicker from 'expo-image-picker';
import { useFileUpload } from '../../../hooks/api';
import VideoPlayer from '../../VideoPlayer';
import { getImageRatio } from '../../../utils/helpers';

export type LaunchCoinProps = {
  imageProps?: ImageSourcePropType;
  name?: string;
  event?: NDKEvent;
  profileProps?: NDKUserProfile;
  token?: TokenDeployInterface;
  dataMeged?: LaunchCoinProps;
  launch?: TokenLaunchInterface;
  isViewDetailDisabled?: boolean;
  isModalVisibleProps?: boolean;
  isButtonOpenVisible?: boolean;
  setIsModalVisibleProps?: (isModalVisible: boolean) => void;
  setMetadataProps?: (metadata: MetadataOnchain) => void;
  metadataProps?: MetadataOnchain;
  isHandleMetadata?: boolean;
  setVideoProps?: (video: ImagePicker.ImagePickerAsset | any) => void;
  setImageProps?: (image: ImagePicker.ImagePickerAsset | undefined) => void;
};

enum AmountType {
  QUOTE_AMOUNT,
  COIN_AMOUNT_TO_BUY,
}

export const FormMetadataChildren: React.FC<LaunchCoinProps> = ({
  token,
  launch,
  imageProps,
  name,
  profileProps,
  event,
  isViewDetailDisabled,
  isModalVisibleProps,
  setIsModalVisibleProps,
  isButtonOpenVisible,
  setMetadataProps,
  metadataProps,
  isHandleMetadata,
  setVideoProps,
  setImageProps
}) => {
  const { data: profile } = useProfile({ publicKey: event?.pubkey });
  const { account } = useAccount();
  const { showToast } = useToast();
  const { theme } = useTheme();
  const styles = useStyles(stylesheet);
  // const navigation = useNavigation<MainStackNavigationProps>();

  const fileUpload = useFileUpload();

  const { addMetadata } = useMetadataLaunch();
  const { handleLaunchCoin } = useLaunchToken();
  const waitConnection = useWaitConnection();

  const handleCopy = async () => {
    if (!token?.memecoin_address) return;
    await Clipboard.setStringAsync(token?.memecoin_address);
    showToast({ type: 'info', title: 'Copied to clipboard' });
  };
  const [video, setVideo] = useState<ImagePicker.ImagePickerAsset | any>();
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | undefined>();


  const [isExpanded, setIsExpanded] = useState<boolean>(false)
  const [isExpandedSymbol, setIsExpandedSymbol] = useState<boolean>(false)
  const [isModalVisible, setIsModalVisible] = useState<boolean>(isModalVisibleProps ?? false);


  const onGalleryPress = async () => {
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      allowsMultipleSelection: false,
      selectionLimit: 1,
      exif: false,
      quality: 0.75,
    });

    if (pickerResult.canceled || !pickerResult.assets.length) return;
    setImage(pickerResult.assets[0]);
    setImageProps?.(pickerResult.assets[0])
  };


  const handleClose = () => {
    setIsModalVisible(false);
    setIsExpanded(false);
    setIsModalVisibleProps?.(false);
    setIsExpandedSymbol(false);
  }

  const handleOpen = () => {
    setIsModalVisible(true);
    setIsExpanded(true);
    setIsModalVisibleProps?.(true);
    setIsExpandedSymbol(true);
  }
  const handleVideoSelect = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      selectionLimit: 1,
      exif: false,
      quality: 1,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setVideo(asset);
      setVideoProps?.(asset)
    }
  };

  const [metadata, setMetadata] = useState<{
    url: string;
    nostr_event_id: string;
    website: string;
    twitter: string;
    github: string;
    telegram: string;
  }>({
    url: '',
    nostr_event_id: '',
    website: '',
    twitter: '',
    github: '',
    telegram: '',
  });
  const handleAddMetadata = async () => {
    if (!token?.memecoin_address && !launch?.token_address) {
      showToast({ type: 'error', title: 'Please add token address' });
      return;
    };



    if (!account) {
      const waitConnection = useWaitConnection();

      showToast({ type: 'error', title: 'Please connect your account' });
      return;
    };
    // upload image/video to IPFS

    // const image = await uploadImageToIPFS(image);

    let url = '';

    let imageUrl: string | undefined;

    if (image) {
      const result = await fileUpload.mutateAsync(image);
      if (result.data.url) imageUrl = result.data.url;
    }

    if (video) {
      const result = await fileUpload.mutateAsync(video);
      if (result.data.url) imageUrl = result.data.url;
    }

    let nostr_event_id = 0;

    console.log("imageUrl", imageUrl);

    await addMetadata(account, {
      coin_address: token?.memecoin_address ?? launch?.token_address ?? '',
      url: imageUrl,
      nostr_event_id: nostr_event_id?.toString()
    });
  }

  return (
    <View style={styles.container}>

      {isButtonOpenVisible && (
        <Pressable onPress={() => handleOpen()}>
          <Text>Open </Text>
        </Pressable>
      )}

      {isModalVisible && (
        <ScrollView>

          <Button
            onPress={() => handleClose()}
          >
            <Text>Close</Text>
          </Button>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Token Metadata</Text>


            <View style={styles.formGroup}>
              <Text style={styles.label}>Nostr event ID / pubkey linked</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Nostr event id"
                multiline
                numberOfLines={4}
                value={metadata.nostr_event_id}
                onChangeText={(text) => {
                  setMetadata({ ...metadata, nostr_event_id: text })
                  setMetadataProps?.({ ...metadataProps, nostr_event_id: text })
                }}
              />
            </View>




            <View style={styles.formGroup}>
              <Text style={styles.label}>Website</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Website"
                multiline
                numberOfLines={4}
                value={metadata.website}
                onChangeText={(text) => {
                  setMetadata({ ...metadata, website: text })
                  setMetadataProps?.({ ...metadataProps, website: text })
                }}
              />
            </View>


            <View style={styles.formGroup}>
              <Text style={styles.label}>Twitter</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Twitter"
                multiline
                numberOfLines={4}
                value={metadata.twitter}
                onChangeText={(text) => {
                  setMetadata({ ...metadata, twitter: text })
                  setMetadataProps?.({ ...metadataProps, twitter: text })
                }}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Twitter</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Telegram"
                multiline
                numberOfLines={4}
                value={metadata.telegram}
                onChangeText={(text) => {
                  setMetadata({ ...metadata, telegram: text })
                  setMetadataProps?.({ ...metadataProps, telegram: text })
                }}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Github</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Github"
                multiline
                numberOfLines={4}
                value={metadata.github}
                onChangeText={(text) => {
                  setMetadata({ ...metadata, github: text })
                  setMetadataProps?.({ ...metadataProps, github: text })
                }}
              />
            </View>

                

            <Text style={styles.label}>Media</Text>



            {image && (
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: image.uri }}
                  style={[styles.image, { aspectRatio: getImageRatio(image.width, image.height) }]}
                />
              </View>
            )}

            {video && (
              <View style={styles.videoContainer}>
                <VideoPlayer uri={video.uri} />
              </View>
            )}

            <View style={styles.mediaUpload}>

              <View style={styles.mediaButtons}>
                {!video && (
                  <Pressable onPress={onGalleryPress}>
                    <GalleryIcon width="24" height="24" color={theme.colors.red} />
                  </Pressable>
                )}

                {!image && (
                  <Pressable onPress={handleVideoSelect}>
                    <VideoIcon width="30" height="30" color={theme.colors.red} />
                  </Pressable>
                )}
              </View>
              {/* <TouchableOpacity
                    style={styles.uploadButton}
                    onPress={() => {
                      // Handle media upload
                    }}
                  >
                    <Text style={styles.uploadButtonText}>Upload Image/Video</Text>
                  </TouchableOpacity> */}
            </View>
          </View>

          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setIsModalVisible(false)}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>

            {isHandleMetadata &&
              <TouchableOpacity
                style={styles.submitButton}
                onPress={() => {
                  handleAddMetadata()
                  // Handle form submission
                  // setIsModalVisible(false);
                }}
              >
                <Text style={styles.buttonText}>Submit</Text>
              </TouchableOpacity>
            }

          </View>
        </ScrollView>
      )}
    </View>
  );
};
