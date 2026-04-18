import 'package:shared_preferences/shared_preferences.dart';
import 'api_service.dart';
import '../models/user.dart';

class AuthService {
  static Future<User?> login(String email, String password) async {
    try {
      final res = await ApiService.login(email, password);
      if (res['success'] == true) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('accessToken', res['data']['accessToken']);
        await prefs.setString('refreshToken', res['data']['refreshToken']);
        return User.fromJson(res['data']['user']);
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  static Future<User?> register(Map<String, dynamic> data) async {
    try {
      final res = await ApiService.register(data);
      if (res['success'] == true) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('accessToken', res['data']['accessToken']);
        await prefs.setString('refreshToken', res['data']['refreshToken']);
        return User.fromJson(res['data']['user']);
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  static Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('accessToken');
    await prefs.remove('refreshToken');
  }

  static Future<bool> isLoggedIn() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('accessToken') != null;
  }

  static Future<User?> getCurrentUser() async {
    try {
      final res = await ApiService.getMe();
      if (res['success'] == true) {
        return User.fromJson(res['data']['user']);
      }
      return null;
    } catch (e) {
      return null;
    }
  }
}