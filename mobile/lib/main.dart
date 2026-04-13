import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'services/api_service.dart';
import 'screens/login_screen.dart';
import 'screens/register_screen.dart';
import 'screens/home_screen.dart';
import 'screens/report_screen.dart';

void main() {
  ApiService.init();
  runApp(const ProviderScope(child: CivicPulseApp()));
}

class CivicPulseApp extends StatelessWidget {
  const CivicPulseApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'CivicPulse',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF1976D2),
        ),
        useMaterial3: true,
      ),
      home: const AppNavigator(),
    );
  }
}

class AppNavigator extends StatefulWidget {
  const AppNavigator({super.key});

  @override
  State<AppNavigator> createState() => _AppNavigatorState();
}

class _AppNavigatorState extends State<AppNavigator> {
  String _screen = 'login';

  void _go(String screen) => setState(() => _screen = screen);

  @override
  Widget build(BuildContext context) {
    switch (_screen) {
      case 'login':
        return LoginScreen(
          onLogin:    () => _go('home'),
          onRegister: () => _go('register'),
        );
      case 'register':
        return RegisterScreen(
          onRegister: () => _go('home'),
          onLogin:    () => _go('login'),
        );
      case 'home':
        return HomeScreen(
          onReport:  () => _go('report'),
          onLogout:  () => _go('login'),
        );
      case 'report':
        return ReportScreen(
          onSubmitted: () => _go('home'),
        );
      default:
        return LoginScreen(
          onLogin:    () => _go('home'),
          onRegister: () => _go('register'),
        );
    }
  }
}