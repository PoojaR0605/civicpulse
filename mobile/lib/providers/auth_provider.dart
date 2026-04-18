import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/user.dart';
import '../services/auth_service.dart';

class AuthNotifier extends StateNotifier<User?> {
  AuthNotifier() : super(null);

  Future<bool> login(String email, String password) async {
    final user = await AuthService.login(email, password);
    if (user != null) {
      state = user;
      return true;
    }
    return false;
  }

  Future<bool> register(Map<String, dynamic> data) async {
    final user = await AuthService.register(data);
    if (user != null) {
      state = user;
      return true;
    }
    return false;
  }

  Future<void> loadUser() async {
    final user = await AuthService.getCurrentUser();
    state = user;
  }

  Future<void> logout() async {
    await AuthService.logout();
    state = null;
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, User?>(
  (ref) => AuthNotifier(),
);