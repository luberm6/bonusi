# Переезд на React Navigation (V2)

Окружение приложения подготовлено к переходу на индустриальный стандарт навигации, как вы и запрашивали. В связи с отсутствием пакетов в вашей текущей среде, автоматическая замена файлов отключена во избежание "Красного экрана" (Red Screen of Death).

## Инструкция по переключению:

1. Откройте терминал на вашей машине в папке `mobile`.
2. Установите зависимости React Navigation:
   ```bash
   npm install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/native-stack react-native-screens react-native-safe-area-context
   ```
3. Откройте `App.tsx` или `mobile-root-shell.tsx` (в зависимости от того, где вызывается экран клиента) и замените старый импорт:
   ```tsx
   // Было:
   import { ClientHomeScreen } from "../../modules/client/home/ClientHomeScreen";
   
   // Стало:
   import { ClientHomeV2 as ClientHomeScreen } from "../../modules/client/v2";
   ```
4. В папке `mobile/src/modules/client/v2/screens/` создайте визуальные компоненты, скопировав куски верстки (например, `renderHome`) из старого файла. Состояние (контекст) подключается через хук:
   ```tsx
   import { useClientData } from "../ClientDataContext";
   
   export function HomeTabScreen({ navigation }) {
     const { me, bonusBalance } = useClientData();
     return <View>...</View>;
   }
   ```
5. Пересоберите проект (`npm run android / npm run ios`).
