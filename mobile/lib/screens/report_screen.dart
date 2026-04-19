import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:geolocator/geolocator.dart';
import 'package:dio/dio.dart';
import 'dart:typed_data';
import '../services/api_service.dart';
import '../providers/issues_provider.dart';

class ReportScreen extends ConsumerStatefulWidget {
  final VoidCallback onSubmitted;
  final VoidCallback onBack;

  const ReportScreen({
    super.key,
    required this.onSubmitted,
    required this.onBack,
  });

  @override
  ConsumerState<ReportScreen> createState() => _ReportScreenState();
}

class _ReportScreenState extends ConsumerState<ReportScreen> {
  final _titleCtrl = TextEditingController();
  final _descCtrl  = TextEditingController();
  String _category  = 'pothole';
  Uint8List? _imageBytes;
  String?    _imageName;
  bool _submitting  = false;
  String? _error;

  // GPS
  double? _lat;
  double? _lng;
  double? _accuracy;
  String  _locationStatus = 'Tap to get GPS location';
  bool    _gettingLocation = false;

  static const _categories = [
    ('pothole',      'Pothole',      Icons.warning_rounded),
    ('garbage',      'Garbage',      Icons.delete_outline),
    ('streetlight',  'Streetlight',  Icons.lightbulb_outline),
    ('sewage',       'Sewage',       Icons.water_damage_outlined),
    ('encroachment', 'Encroachment', Icons.block_outlined),
    ('waterlogging', 'Waterlogging', Icons.water_outlined),
    ('other',        'Other',        Icons.report_outlined),
  ];

  // GET GPS LOCATION
  Future<void> _getLocation() async {
    setState(() {
      _gettingLocation = true;
      _locationStatus  = 'Acquiring GPS...';
    });

    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        setState(() {
          _locationStatus  = 'Location services disabled';
          _gettingLocation = false;
        });
        return;
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          setState(() {
            _locationStatus  = 'Location permission denied';
            _gettingLocation = false;
          });
          return;
        }
      }

      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );

      setState(() {
        _lat             = position.latitude;
        _lng             = position.longitude;
        _accuracy        = position.accuracy;
        _locationStatus  = 'Location captured (±${position.accuracy.toStringAsFixed(0)}m)';
        _gettingLocation = false;
      });
    } catch (e) {
      setState(() {
        _locationStatus  = 'Location error — using default';
        _lat             = 12.975;
        _lng             = 77.575;
        _gettingLocation = false;
      });
    }
  }

  // LIVE CAMERA ONLY
  Future<void> _capturePhoto() async {
    final picker = ImagePicker();
    try {
      final picked = await picker.pickImage(
        source: ImageSource.camera,
        maxWidth: 1920,
        imageQuality: 85,
        preferredCameraDevice: CameraDevice.rear,
      );
      if (picked != null) {
        final bytes = await picked.readAsBytes();
        setState(() {
          _imageBytes = bytes;
          _imageName  = picked.name;
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Camera error: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  bool get _canSubmit =>
      _imageBytes != null &&
      _lat != null &&
      !_submitting;

  Future<void> _submit() async {
    if (!_canSubmit) return;
    setState(() { _submitting = true; _error = null; });

    try {
      final formData = FormData.fromMap({
        'latitude':    _lat.toString(),
        'longitude':   _lng.toString(),
        'gpsAccuracy': _accuracy?.toString() ?? '15.0',
        'category':    _category,
        'title':       _titleCtrl.text.trim().isEmpty
                         ? _category
                         : _titleCtrl.text.trim(),
        'description': _descCtrl.text.trim(),
        'photo': MultipartFile.fromBytes(
          _imageBytes!,
          filename: _imageName ?? 'issue.jpg',
        ),
      });

      final res = await ApiService.submitIssue(formData);
      if (res['success'] == true) {
        await ref.read(issuesProvider.notifier).loadMyIssues();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Issue reported successfully!'),
              backgroundColor: Colors.green,
              duration: Duration(seconds: 3),
            ),
          );
          widget.onSubmitted();
        }
      }
    } catch (e) {
      setState(() => _error = 'Submission failed. Check your connection.');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF0F4FF),
      appBar: AppBar(
        title: const Text('Report Issue'),
        backgroundColor: const Color(0xFF1565C0),
        foregroundColor: Colors.white,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: widget.onBack,
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [

            // STEP 1 — GPS LOCATION
            _SectionCard(
              step: '1',
              title: 'Your Location',
              child: Column(
                children: [
                  GestureDetector(
                    onTap: _gettingLocation ? null : _getLocation,
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: _lat != null
                            ? Colors.green.shade50
                            : Colors.blue.shade50,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: _lat != null
                              ? Colors.green.shade300
                              : Colors.blue.shade200,
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            _lat != null
                                ? Icons.gps_fixed
                                : Icons.gps_not_fixed,
                            color: _lat != null
                                ? Colors.green
                                : const Color(0xFF1565C0),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment:
                                  CrossAxisAlignment.start,
                              children: [
                                Text(
                                  _locationStatus,
                                  style: TextStyle(
                                    fontWeight: FontWeight.w500,
                                    fontSize: 14,
                                    color: _lat != null
                                        ? Colors.green.shade700
                                        : const Color(0xFF1565C0),
                                  ),
                                ),
                                if (_lat != null)
                                  Text(
                                    '${_lat!.toStringAsFixed(6)}, ${_lng!.toStringAsFixed(6)}',
                                    style: TextStyle(
                                      fontSize: 11,
                                      color: Colors.grey.shade500,
                                      fontFamily: 'monospace',
                                    ),
                                  ),
                              ],
                            ),
                          ),
                          if (_gettingLocation)
                            const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2),
                            )
                          else if (_lat == null)
                            const Icon(Icons.chevron_right,
                                color: Colors.grey),
                        ],
                      ),
                    ),
                  ),
                  if (_lat == null) ...[
                    const SizedBox(height: 8),
                    Text(
                      'Tap above to capture your exact GPS location',
                      style: TextStyle(
                          fontSize: 12, color: Colors.grey.shade500),
                    ),
                  ],
                ],
              ),
            ),

            const SizedBox(height: 12),

            // STEP 2 — LIVE PHOTO
            _SectionCard(
              step: '2',
              title: 'Live Photo Evidence',
              child: Column(
                children: [
                  GestureDetector(
                    onTap: _capturePhoto,
                    child: Container(
                      width: double.infinity,
                      height: _imageBytes != null ? null : 180,
                      decoration: BoxDecoration(
                        color: _imageBytes != null
                            ? null
                            : Colors.grey.shade50,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: _imageBytes != null
                              ? const Color(0xFF1565C0)
                              : Colors.grey.shade300,
                          width: _imageBytes != null ? 2 : 1,
                        ),
                      ),
                      child: _imageBytes != null
                          ? Column(
                              children: [
                                ClipRRect(
                                  borderRadius:
                                      const BorderRadius.vertical(
                                          top: Radius.circular(8)),
                                  child: Image.memory(
                                    _imageBytes!,
                                    width: double.infinity,
                                    height: 200,
                                    fit: BoxFit.cover,
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      vertical: 10),
                                  child: Row(
                                    mainAxisAlignment:
                                        MainAxisAlignment.center,
                                    children: [
                                      const Icon(Icons.check_circle,
                                          color: Colors.green, size: 16),
                                      const SizedBox(width: 6),
                                      const Text('Live photo captured',
                                          style: TextStyle(
                                              color: Colors.green,
                                              fontSize: 13,
                                              fontWeight:
                                                  FontWeight.w500)),
                                      const SizedBox(width: 16),
                                      TextButton.icon(
                                        onPressed: _capturePhoto,
                                        icon: const Icon(Icons.refresh,
                                            size: 14),
                                        label: const Text('Retake',
                                            style:
                                                TextStyle(fontSize: 12)),
                                        style: TextButton.styleFrom(
                                          foregroundColor:
                                              const Color(0xFF1565C0),
                                          padding: EdgeInsets.zero,
                                          minimumSize: Size.zero,
                                          tapTargetSize: MaterialTapTargetSize
                                              .shrinkWrap,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            )
                          : Column(
                              mainAxisAlignment:
                                  MainAxisAlignment.center,
                              children: [
                                Container(
                                  width: 64,
                                  height: 64,
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF1565C0)
                                        .withOpacity(0.1),
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(Icons.camera_alt,
                                      size: 32,
                                      color: Color(0xFF1565C0)),
                                ),
                                const SizedBox(height: 10),
                                const Text(
                                  'Take Live Photo',
                                  style: TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w600,
                                    color: Color(0xFF1565C0),
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'Camera opens directly\nGallery uploads not permitted',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                      fontSize: 12,
                                      color: Colors.grey.shade500),
                                ),
                              ],
                            ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 12),

            // STEP 3 — CATEGORY
            _SectionCard(
              step: '3',
              title: 'Issue Category',
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _categories.map((cat) {
                  final (id, label, icon) = cat;
                  final selected = _category == id;
                  return GestureDetector(
                    onTap: () => setState(() => _category = id),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 150),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: selected
                            ? const Color(0xFF1565C0)
                            : Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: selected
                              ? const Color(0xFF1565C0)
                              : Colors.grey.shade300,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(icon,
                              size: 14,
                              color: selected
                                  ? Colors.white
                                  : Colors.grey.shade600),
                          const SizedBox(width: 6),
                          Text(
                            label,
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: selected
                                  ? FontWeight.w600
                                  : FontWeight.normal,
                              color: selected
                                  ? Colors.white
                                  : Colors.black87,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),

            const SizedBox(height: 12),

            // STEP 4 — DETAILS
            _SectionCard(
              step: '4',
              title: 'Issue Details',
              child: Column(
                children: [
                  TextField(
                    controller: _titleCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Title (optional)',
                      hintText: 'e.g. Large pothole near bus stop',
                      prefixIcon: Icon(Icons.title),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _descCtrl,
                    maxLines: 3,
                    decoration: const InputDecoration(
                      labelText: 'Description (optional)',
                      hintText: 'Additional details...',
                      prefixIcon: Icon(Icons.description_outlined),
                      alignLabelWithHint: true,
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // ERROR
            if (_error != null)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.red.shade200),
                ),
                child: Text(_error!,
                    style: TextStyle(
                        color: Colors.red.shade700, fontSize: 13)),
              ),

            // BLOCKED MESSAGE
            if (!_canSubmit && !_submitting)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(
                  color: Colors.amber.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.amber.shade200),
                ),
                child: Row(
                  children: [
                    Icon(Icons.info_outline,
                        color: Colors.amber.shade700, size: 16),
                    const SizedBox(width: 8),
                    Text(
                      _lat == null && _imageBytes == null
                          ? 'Get GPS location and take a photo to continue'
                          : _lat == null
                              ? 'Get your GPS location first'
                              : 'Take a live photo to continue',
                      style: TextStyle(
                          color: Colors.amber.shade700, fontSize: 13),
                    ),
                  ],
                ),
              ),

            // SUBMIT
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton(
                onPressed: _canSubmit ? _submit : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF1565C0),
                  foregroundColor: Colors.white,
                  disabledBackgroundColor: Colors.grey.shade300,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                  elevation: 0,
                ),
                child: _submitting
                    ? const SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(
                          color: Colors.white,
                          strokeWidth: 2.5,
                        ),
                      )
                    : const Text(
                        'Submit Report',
                        style: TextStyle(
                            fontSize: 16, fontWeight: FontWeight.w600),
                      ),
              ),
            ),

            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  final String step;
  final String title;
  final Widget child;

  const _SectionCard({
    required this.step,
    required this.title,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 24,
                height: 24,
                decoration: const BoxDecoration(
                  color: Color(0xFF1565C0),
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Text(
                    step,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                title,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: Colors.black87,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          child,
        ],
      ),
    );
  }
}