import React, {useEffect} from 'react';
import {View, StyleSheet} from 'react-native';

// Camera component for Windows
export default function Camera(props) {
  useEffect(() => {}, []);

  return (
    <View style={styles.root}>
      {/* This is a place holder until windows camera module is ready */}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: '#fff',
    flex: 1,
    padding: 20,
  },
});
