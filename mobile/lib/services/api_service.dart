import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  static const String baseUrl = 'http://localhost:3000/api/v1';

  static final Dio _dio = Dio(BaseOptions(
    baseUrl: baseUrl,
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 10),
  ));

  static void init() {
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final prefs = await SharedPreferences.getInstance();
        final token = prefs.getString('accessToken');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (error, handler) {
        handler.next(error);
      },
    ));
  }

  static Dio get dio => _dio;

  static Future<Map<String, dynamic>> register(
      Map<String, dynamic> data) async {
    final res = await _dio.post('/auth/register', data: data);
    return res.data;
  }

  static Future<Map<String, dynamic>> login(
      String email, String password) async {
    final res = await _dio.post('/auth/login', data: {
      'email': email,
      'password': password,
    });
    return res.data;
  }

  static Future<Map<String, dynamic>> getMe() async {
    final res = await _dio.get('/auth/me');
    return res.data;
  }

  static Future<Map<String, dynamic>> getIssues({
    String? wardId,
    String? category,
    String? status,
    int page = 1,
  }) async {
    final res = await _dio.get('/issues', queryParameters: {
      if (wardId != null) 'wardId': wardId,
      if (category != null) 'category': category,
      if (status != null) 'status': status,
      'page': page,
    });
    return res.data;
  }

  static Future<Map<String, dynamic>> getMyIssues() async {
    final res = await _dio.get('/issues/mine');
    return res.data;
  }

  static Future<Map<String, dynamic>> submitIssue(
      FormData formData) async {
    final res = await _dio.post(
      '/issues',
      data: formData,
      options: Options(contentType: 'multipart/form-data'),
    );
    return res.data;
  }

  static Future<Map<String, dynamic>> voteIssue(String issueId) async {
    final res = await _dio.post('/issues/$issueId/vote');
    return res.data;
  }

  static Future<Map<String, dynamic>> locateWard(
      double lat, double lng) async {
    final res = await _dio.get('/wards/locate', queryParameters: {
      'lat': lat,
      'lng': lng,
    });
    return res.data;
  }
}