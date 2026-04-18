import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/issue.dart';
import '../services/api_service.dart';

class IssuesNotifier extends StateNotifier<List<Issue>> {
  IssuesNotifier() : super([]);

  Future<void> loadMyIssues() async {
    try {
      final res = await ApiService.getMyIssues();
      if (res['success'] == true) {
        final list = res['data'] as List;
        state = list.map((e) => Issue.fromJson(e)).toList();
      }
    } catch (e) {
      state = [];
    }
  }

  Future<void> loadAllIssues({String? category, String? status}) async {
    try {
      final res = await ApiService.getIssues(
        category: category,
        status: status,
      );
      if (res['success'] == true) {
        final list = res['data']['issues'] as List;
        state = list.map((e) => Issue.fromJson(e)).toList();
      }
    } catch (e) {
      state = [];
    }
  }
}

final issuesProvider = StateNotifierProvider<IssuesNotifier, List<Issue>>(
  (ref) => IssuesNotifier(),
);