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
      case 'in_progress': return const Color(0xFF1565C0);
      case 'validated':   return Colors.teal;
      case 'rejected':    return Colors.red;
      default:            return Colors.orange;
    }
  }

  IconData _categoryIcon(String category) {
    switch (category) {
      case 'pothole':      return Icons.warning_rounded;
      case 'garbage':      return Icons.delete_outline;
      case 'streetlight':  return Icons.lightbulb_outline;
      case 'sewage':       return Icons.water_damage_outlined;
      case 'encroachment': return Icons.block_outlined;
      case 'waterlogging': return Icons.water_outlined;
      default:             return Icons.report_outlined;
    }
  }

  @override
  Widget build(BuildContext context) {
    final user   = ref.watch(authProvider);
    final issues = ref.watch(issuesProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF0F4FF),
      body: CustomScrollView(
        slivers: [
          // App Bar
          SliverAppBar(
            expandedHeight: 160,
            floating: false,
            pinned: true,
            backgroundColor: const Color(0xFF1565C0),
            automaticallyImplyLeading: false,
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [Color(0xFF1565C0), Color(0xFF1976D2)],
                  ),
                ),
                padding: const EdgeInsets.fromLTRB(20, 60, 20, 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Hello, ${user?.name.split(' ').first ?? 'Citizen'}!',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 22,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'Report civic issues in your area',
                              style: TextStyle(
                                color: Colors.white.withOpacity(0.8),
                                fontSize: 13,
                              ),
                            ),
                          ],
                        ),
                        GestureDetector(
                          onTap: () async {
                            await ref.read(authProvider.notifier).logout();
                            widget.onLogout();
                          },
                          child: Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Icon(Icons.logout,
                                color: Colors.white, size: 20),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            // Stats bar
            bottom: PreferredSize(
              preferredSize: const Size.fromHeight(70),
              child: Container(
                margin: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                padding: const EdgeInsets.symmetric(
                    horizontal: 16, vertical: 10),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _StatItem(
                      label: 'Total',
                      value: issues.length,
                      color: const Color(0xFF1565C0),
                    ),
                    _Divider(),
                    _StatItem(
                      label: 'Pending',
                      value: issues.where((i) =>
                              i.status == 'submitted' ||
                              i.status == 'validated')
                          .length,
                      color: Colors.orange,
                    ),
                    _Divider(),
                    _StatItem(
                      label: 'Active',
                      value: issues
                          .where((i) => i.status == 'in_progress')
                          .length,
                      color: Colors.blue,
                    ),
                    _Divider(),
                    _StatItem(
                      label: 'Resolved',
                      value: issues
                          .where((i) => i.status == 'resolved')
                          .length,
                      color: Colors.green,
                    ),
                  ],
                ),
              ),
            ),
          ),

          // Issues List
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
            sliver: issues.isEmpty
                ? SliverFillRemaining(
                    child: Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            width: 80,
                            height: 80,
                            decoration: BoxDecoration(
                              color: Colors.grey.shade100,
                              shape: BoxShape.circle,
                            ),
                            child: Icon(Icons.report_outlined,
                                size: 40, color: Colors.grey.shade400),
                          ),
                          const SizedBox(height: 16),
                          const Text(
                            'No issues reported yet',
                            style: TextStyle(
                                fontSize: 16, fontWeight: FontWeight.w500),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Tap the button below to report\na civic issue in your area',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                                fontSize: 13, color: Colors.grey.shade500),
                          ),
                        ],
                      ),
                    ),
                  )
                : SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, index) {
                        final issue = issues[index];
                        return Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.05),
                                blurRadius: 8,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(14),
                            child: Row(
                              children: [
                                Container(
                                  width: 48,
                                  height: 48,
                                  decoration: BoxDecoration(
                                    color: _statusColor(issue.status)
                                        .withOpacity(0.1),
                                    borderRadius:
                                        BorderRadius.circular(12),
                                  ),
                                  child: Icon(
                                    _categoryIcon(issue.category),
                                    color: _statusColor(issue.status),
                                    size: 24,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        issue.title ??
                                            issue.categoryLabel,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w600,
                                          fontSize: 14,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        issue.wardName ??
                                            'Location pending',
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: Colors.grey.shade500,
                                        ),
                                      ),
                                      const SizedBox(height: 6),
                                      Row(
                                        children: [
                                          Container(
                                            padding:
                                                const EdgeInsets.symmetric(
                                                    horizontal: 8,
                                                    vertical: 3),
                                            decoration: BoxDecoration(
                                              color: _statusColor(
                                                      issue.status)
                                                  .withOpacity(0.1),
                                              borderRadius:
                                                  BorderRadius.circular(
                                                      20),
                                            ),
                                            child: Text(
                                              issue.statusLabel,
                                              style: TextStyle(
                                                fontSize: 11,
                                                fontWeight:
                                                    FontWeight.w600,
                                                color: _statusColor(
                                                    issue.status),
                                              ),
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          if (issue.slaBreached)
                                            Container(
                                              padding:
                                                  const EdgeInsets
                                                      .symmetric(
                                                      horizontal: 8,
                                                      vertical: 3),
                                              decoration: BoxDecoration(
                                                color: Colors.red
                                                    .withOpacity(0.1),
                                                borderRadius:
                                                    BorderRadius.circular(
                                                        20),
                                              ),
                                              child: const Text(
                                                'SLA Breached',
                                                style: TextStyle(
                                                  fontSize: 11,
                                                  fontWeight:
                                                      FontWeight.w600,
                                                  color: Colors.red,
                                                ),
                                              ),
                                            ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                                Column(
                                  children: [
                                    Text(
                                      '${issue.voteCount}',
                                      style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 16,
                                        color: Color(0xFF1565C0),
                                      ),
                                    ),
                                    Icon(Icons.thumb_up_outlined,
                                        size: 14,
                                        color: Colors.grey.shade400),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                      childCount: issues.length,
                    ),
                  ),
          ),
        ],
      ),

      // FAB — Report Issue
      floatingActionButton: FloatingActionButton.extended(
        onPressed: widget.onReport,
        backgroundColor: const Color(0xFF1565C0),
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add_location_alt),
        label: const Text('Report Issue',
            style: TextStyle(fontWeight: FontWeight.w600)),
        elevation: 4,
      ),
      floatingActionButtonLocation:
          FloatingActionButtonLocation.centerFloat,
    );
  }
}

class _StatItem extends StatelessWidget {
  final String label;
  final int value;
  final Color color;

  const _StatItem({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          '$value',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        Text(
          label,
          style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
        ),
      ],
    );
  }
}

class _Divider extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      height: 30,
      width: 1,
      color: Colors.grey.shade200,
    );
  }
}