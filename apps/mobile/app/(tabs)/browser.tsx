import { SafeAreaView } from 'react-native-safe-area-context';
import { BrowserView } from '@/components/browser/BrowserView';

export default function BrowserScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'hsl(300, 10%, 5%)' }} edges={['top']}>
      <BrowserView />
    </SafeAreaView>
  );
}
