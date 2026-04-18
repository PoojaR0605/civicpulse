import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/auth_provider.dart';
import '../providers/issues_provider.dart';

class HomeScreen extends ConsumerStatefulWidget {
  final VoidCallback onReport;
  final VoidCallback onLogout;

  const HomeScreen({
    super.key,
    required this.onReport,
    required this.onLogout,
  });

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(
        () => ref.read(issuesProvider.notifier).loadMyIssues());
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'resolved':    return Colors.green;
      case 'in_progress': return Colors.blue;
      case 'validated':   return Colors.teal;
      case 'rejected':    return Colors.red;
      default:            return Colors.orange;
    }
  }

  @override
  Widget build(BuildContext context) {
    final user   = ref.watch(authProvider);
    final issues = ref.watch(issuesProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      appBar: AppBar(
        title: const Text('CivicPulse'),
        backgroundColor: const Color(0xFF1976D2),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await ref.read(authProvider.notifier).logout();
              widget.onLogout();
            },
          ),
        ],
      ),
      body: Column(
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            color: const Color(0xFF1976D2),
            child: Text(
              'Welcome, ${user?.name ?? 'Citizen'}',
              style: const TextStyle(
                  color: Colors.white, fontSize: 16),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                _StatCard(
                  label: 'My Reports',
                  value: issues.length.toString(),
                  color: Colors.blue,
                ),
                const SizedBox(width: 12),
                _StatCard(
                  label: 'Resolved',
                  value: issues
                      .where((i) => i.status == 'resolved')
                      .length
                      .toString(),
                  color: Colors.green,
                ),
                const SizedBox(width: 12),
                _StatCard(
                  label: 'Pending',
                  value: issues
                      .where((i) => i.status == 'submitted')
                      .length
                      .toString(),
                  color: Colors.orange,
                ),
              ],
            ),
          ),
          Expanded(
            child: issues.isEmpty
                ? const Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.report_outlined,
                            size: 64, color: Colors.grey),
                        SizedBox(height: 16),
                        Text('No issues reported yet',
                            style:
                                TextStyle(color: Colors.grey)),
                      ],
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16),
                    itemCount: issues.length,
                    itemBuilder: (context, index) {
                      final issue = issues[index];
                      return Card(
                        margin:
                            const EdgeInsets.only(bottom: 12),
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: _statusColor(
                                    issue.status)
                                .withOpacity(0.1),
                            child: Icon(
                              Icons.location_on,
                              color:
                                  _statusColor(issue.status),
                            ),
                          ),
                          title: Text(
                            issue.title ?? issue.categoryLabel,
                            style: const TextStyle(
                                fontWeight: FontWeight.w500),
                          ),
                          subtitle: Text(
                            '${issue.wardName ?? 'Unknown ward'} • ${issue.categoryLabel}',
                            style:
                                const TextStyle(fontSize: 12),
                          ),
                          trailing: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: _statusColor(issue.status)
                                  .withOpacity(0.1),
                              borderRadius:
                                  BorderRadius.circular(12),
                            ),
                            child: Text(
                              issue.statusLabel,
                              style: TextStyle(
                                color:
                                    _statusColor(issue.status),
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: widget.onReport,
        backgroundColor: const Color(0xFF1976D2),
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add_location_alt),
        label: const Text('Report Issue'),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _StatCard({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: Colors.grey.shade200),
        ),
        child: Column(
          children: [
            Text(value,
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: color,
                )),
            Text(label,
                style: const TextStyle(
                    fontSize: 11, color: Colors.grey)),
          ],
        ),
      ),
    );
  }
}