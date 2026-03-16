const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the shared package and root for changes during development
config.watchFolders = [monorepoRoot];

// Ensure Metro resolves node_modules from both the app and the monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Pin singleton packages to the root copies to prevent duplicate instances
// (critical in monorepos where multiple React versions coexist)
const singletons = [
  'react',
  'react-native',
  'react-dom',
  'expo',
  'expo-router',
  'expo-modules-core',
  'expo-constants',
  '@expo/metro-runtime',
  '@react-navigation/native',
];

config.resolver.extraNodeModules = singletons.reduce((acc, name) => {
  acc[name] = path.resolve(monorepoRoot, 'node_modules', name);
  return acc;
}, {});

module.exports = withNativeWind(config, { input: './global.css', inlineRem: 16 });
