class User {
  final String id;
  final String name;
  final String email;
  final String? phone;
  final String role;
  final String? wardId;
  final String? department;

  User({
    required this.id,
    required this.name,
    required this.email,
    this.phone,
    required this.role,
    this.wardId,
    this.department,
  });

  factory User.fromJson(Map<String, dynamic> json) => User(
    id:         json['id'],
    name:       json['name'],
    email:      json['email'],
    phone:      json['phone'],
    role:       json['role'],
    wardId:     json['ward_id'],
    department: json['department'],
  );

  bool get isOfficer => role == 'officer' || role == 'admin';
}