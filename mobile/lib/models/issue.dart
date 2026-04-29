class Issue {
  final String id;
  final String category;
  final String status;
  final String? title;
  final String? description;
  final double latitude;
  final double longitude;
  final String? photoUrl;
  final double priorityScore;
  final int voteCount;
  final String? wardName;
  final String? reporterName;
  final bool slaBreached;
  final DateTime createdAt;
  final DateTime? slaDeadline;

  Issue({
    required this.id,
    required this.category,
    required this.status,
    this.title,
    this.description,
    required this.latitude,
    required this.longitude,
    this.photoUrl,
    required this.priorityScore,
    required this.voteCount,
    this.wardName,
    this.reporterName,
    required this.slaBreached,
    required this.createdAt,
    this.slaDeadline,
  });

  factory Issue.fromJson(Map<String, dynamic> json) => Issue(
    id:            json['id'],
    category:      json['category'],
    status:        json['status'],
    title:         json['title'],
    description:   json['description'],
    latitude:      double.parse(json['latitude'].toString()),
    longitude:     double.parse(json['longitude'].toString()),
    photoUrl:      json['photo_url'],
    priorityScore: double.parse(json['priority_score']?.toString() ?? '0'),
    voteCount:     json['vote_count'] ?? 0,
    wardName:      json['ward_name'],
    reporterName:  json['reporter_name'],
    slaBreached:   json['sla_breached'] ?? false,
    createdAt:     DateTime.parse(json['created_at']),
    slaDeadline:   json['sla_deadline'] != null
                     ? DateTime.parse(json['sla_deadline'])
                     : null,
  );

  String get statusLabel {
    switch (status) {
      case 'submitted':   return 'Submitted';
      case 'validated':   return 'Validated';
      case 'assigned':    return 'Assigned';
      case 'in_progress': return 'In Progress';
      case 'resolved':    return 'Resolved';
      case 'rejected':    return 'Rejected';
      default:            return status;
    }
  }

  String get categoryLabel {
    switch (category) {
      case 'pothole':      return 'Pothole';
      case 'garbage':      return 'Garbage';
      case 'streetlight':  return 'Streetlight';
      case 'sewage':       return 'Sewage';
      case 'encroachment': return 'Encroachment';
      case 'waterlogging': return 'Waterlogging';
      default:             return 'Other';
    }
  }
}