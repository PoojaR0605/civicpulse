import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:dio/dio.dart';
import 'dart:typed_data';
import '../services/api_service.dart';
import '../providers/issues_provider.dart';

class ReportScreen extends ConsumerStatefulWidget {
  final VoidCallback onSubmitted;

  const ReportScreen({super.key, required this.onSubmitted});

  @override
  ConsumerState<ReportScreen> createState() => _ReportScreenState();
}

class _ReportScreenState extends ConsumerState<ReportScreen> {
  final _titleCtrl = TextEditingController();
  final _descCtrl  = TextEditingController();
  String _category = 'pothole';
  Uint8List? _imageBytes;
  String?   _imageName;
  bool _submitting = false;
  String? _error;

  static const _categories = [
    ('pothole',      'Pothole'),
    ('garbage',      'Garbage'),
    ('streetlight',  'Streetlight'),
    ('sewage',       'Sewage'),
    ('encroachment', 'Encroachment'),
    ('waterlogging', 'Waterlogging'),
    ('other',        'Other'),
  ];

  // LIVE CAMERA ONLY — no gallery
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
            content: Text('Camera error: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  bool get _canSubmit =>
      _imageBytes != null &&
      _category.isNotEmpty &&
      !_submitting;

  Future<void> _submit() async {
    if (!_canSubmit) return;
    setState(() { _submitting = true; _error = null; });

    try {
      final formData = FormData.fromMap({
        'latitude':    '12.975',
        'longitude':   '77.575',
        'gpsAccuracy': '15.0',
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
      backgroundColor: const Color(0xFFF5F5F5),
      appBar: AppBar(
        title: const Text('Report Issue'),
        backgroundColor: const Color(0xFF1976D2),
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [

            // LIVE CAMERA SECTION
            Container(
              width: double.infinity,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: _imageBytes != null
                      ? const Color(0xFF1976D2)
                      : Colors.grey.shade300,
                  width: _imageBytes != null ? 2 : 1,
                ),
              ),
              child: _imageBytes != null
                  ? Column(
                      children: [
                        ClipRRect(
                          borderRadius: const BorderRadius.vertical(
                              top: Radius.circular(12)),
                          child: Image.memory(
                            _imageBytes!,
                            width: double.infinity,
                            height: 240,
                            fit: BoxFit.cover,
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.all(8),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.check_circle,
                                  color: Colors.green, size: 16),
                              const SizedBox(width: 6),
                              const Text('Live photo captured',
                                  style: TextStyle(
                                      color: Colors.green,
                                      fontSize: 13,
                                      fontWeight: FontWeight.w500)),
                              const SizedBox(width: 16),
                              TextButton.icon(
                                onPressed: _capturePhoto,
                                icon: const Icon(Icons.refresh, size: 16),
                                label: const Text('Retake',
                                    style: TextStyle(fontSize: 13)),
                                style: TextButton.styleFrom(
                                    foregroundColor: const Color(0xFF1976D2)),
                              ),
                            ],
                          ),
                        ),
                      ],
                    )
                  : InkWell(
                      onTap: _capturePhoto,
                      borderRadius: BorderRadius.circular(12),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 40),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Container(
                              width: 72,
                              height: 72,
                              decoration: BoxDecoration(
                                color: const Color(0xFF1976D2).withOpacity(0.1),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(
                                Icons.camera_alt,
                                size: 36,
                                color: Color(0xFF1976D2),
                              ),
                            ),
                            const SizedBox(height: 12),
                            const Text(
                              'Take Live Photo',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF1976D2),
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Camera opens directly — gallery not allowed',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey.shade500,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Container(
                              margin: const EdgeInsets.only(top: 8),
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: Colors.orange.shade50,
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                    color: Colors.orange.shade200),
                              ),
                              child: Text(
                                'Required',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: Colors.orange.shade700,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
            ),

            const SizedBox(height: 20),

            // CATEGORY
            const Text('Category',
                style: TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 15,
                    color: Colors.black87)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _categories.map((cat) {
                final (id, label) = cat;
                final selected = _category == id;
                return GestureDetector(
                  onTap: () => setState(() => _category = id),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: selected
                          ? const Color(0xFF1976D2)
                          : Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: selected
                            ? const Color(0xFF1976D2)
                            : Colors.grey.shade300,
                      ),
                    ),
                    child: Text(
                      label,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: selected
                            ? FontWeight.w600
                            : FontWeight.normal,
                        color: selected ? Colors.white : Colors.black87,
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),

            const SizedBox(height: 20),

            // TITLE
            const Text('Title',
                style: TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 15,
                    color: Colors.black87)),
            const SizedBox(height: 8),
            TextField(
              controller: _titleCtrl,
              decoration: InputDecoration(
                hintText: 'Brief description of the issue',
                hintStyle: TextStyle(color: Colors.grey.shade400),
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide(color: Colors.grey.shade300),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide(color: Colors.grey.shade300),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: const BorderSide(color: Color(0xFF1976D2)),
                ),
                contentPadding: const EdgeInsets.symmetric(
                    horizontal: 12, vertical: 12),
              ),
            ),

            const SizedBox(height: 16),

            // DESCRIPTION
            const Text('Description',
                style: TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 15,
                    color: Colors.black87)),
            const SizedBox(height: 8),
            TextField(
              controller: _descCtrl,
              maxLines: 3,
              decoration: InputDecoration(
                hintText: 'Additional details about the issue...',
                hintStyle: TextStyle(color: Colors.grey.shade400),
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide(color: Colors.grey.shade300),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide(color: Colors.grey.shade300),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: const BorderSide(color: Color(0xFF1976D2)),
                ),
                contentPadding: const EdgeInsets.symmetric(
                    horizontal: 12, vertical: 12),
              ),
            ),

            const SizedBox(height: 24),

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

            // BLOCKED SUBMIT MESSAGE
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
                      _imageBytes == null
                          ? 'Take a live photo to continue'
                          : 'Select a category to continue',
                      style: TextStyle(
                          color: Colors.amber.shade700, fontSize: 13),
                    ),
                  ],
                ),
              ),

            // SUBMIT BUTTON
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton(
                onPressed: _canSubmit ? _submit : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF1976D2),
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