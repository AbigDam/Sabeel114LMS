// components/Reveal.js
// -----------------------------------------------------------------------------
// One-shot mount animation: fades + lifts its children into place. Pass an
// `index` so a stack of <Reveal> siblings staggers automatically instead of
// arriving all at once — that's the single page-load choreography moment,
// not a per-component gimmick, so keep it to the handful of blocks that
// define a screen's first impression (hero, key sections), not every row.
// -----------------------------------------------------------------------------

import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

export default function Reveal({ children, index = 0, delay = 0, distance = 16, style }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 560,
      delay: delay + index * 90,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [distance, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
