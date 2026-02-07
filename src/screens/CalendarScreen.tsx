// src/screens/CalendarScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  FlatList,
  Alert,
  Modal,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useCalendar } from '../hooks/useCalendar';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOWS } from '../lib/theme';
import dayjs from 'dayjs';
import type { CalendarEvent } from '../types/database';

const EVENT_COLORS = ['#FF6B9D', '#7C4DFF', '#00BCD4', '#FFD54F', '#66BB6A', '#FF7043'];

export default function CalendarScreen() {
  const { events, markedDates, addEvent, deleteEvent, getEventsForDate } = useCalendar();
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newColor, setNewColor] = useState(EVENT_COLORS[0] ?? '#FF6B9D');

  const dayEvents = getEventsForDate(selectedDate);

  const handleAddEvent = useCallback(async () => {
    if (!newTitle.trim()) {
      Alert.alert('Błąd', 'Wpisz nazwę wydarzenia');
      return;
    }
    await addEvent(newTitle.trim(), selectedDate, newTime || undefined, newColor);
    setNewTitle('');
    setNewTime('');
    setShowAddModal(false);
  }, [newTitle, selectedDate, newTime, newColor, addEvent]);

  const handleDelete = useCallback(
    (event: CalendarEvent) => {
      Alert.alert('Usuń wydarzenie', `Usunąć "${event.title}"?`, [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Usuń',
          style: 'destructive',
          onPress: () => deleteEvent(event.id),
        },
      ]);
    },
    [deleteEvent]
  );

  return (
    <View style={styles.container}>
      <Calendar
        current={selectedDate}
        onDayPress={(day: { dateString: string }) => setSelectedDate(day.dateString)}
        markedDates={{
          ...markedDates,
          [selectedDate]: {
            ...(markedDates[selectedDate] ?? {}),
            selected: true,
            selectedColor: COLORS.primary,
          },
        }}
        markingType="multi-dot"
        theme={{
          backgroundColor: COLORS.background,
          calendarBackground: COLORS.surface,
          textSectionTitleColor: COLORS.textSecondary,
          selectedDayBackgroundColor: COLORS.primary,
          selectedDayTextColor: COLORS.textOnPrimary,
          todayTextColor: COLORS.primary,
          dayTextColor: COLORS.text,
          textDisabledColor: COLORS.textLight,
          dotColor: COLORS.primary,
          selectedDotColor: COLORS.textOnPrimary,
          arrowColor: COLORS.primary,
          monthTextColor: COLORS.text,
          textDayFontWeight: '500',
          textMonthFontWeight: '700',
          textDayHeaderFontWeight: '600',
        }}
        style={styles.calendar}
      />

      {/* Selected date header */}
      <View style={styles.dateHeader}>
        <Text style={styles.dateText}>
          {dayjs(selectedDate).format('dddd, D MMMM YYYY')}
        </Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.addButtonText}>+ Dodaj</Text>
        </TouchableOpacity>
      </View>

      {/* Events list */}
      <FlatList
        data={dayEvents}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.eventCard}
            onLongPress={() => handleDelete(item)}
          >
            <View style={[styles.eventDot, { backgroundColor: item.color }]} />
            <View style={styles.eventInfo}>
              <Text style={styles.eventTitle}>{item.title}</Text>
              {item.event_time && (
                <Text style={styles.eventTime}>{item.event_time}</Text>
              )}
              {item.description ? (
                <Text style={styles.eventDesc}>{item.description}</Text>
              ) : null}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyDay}>
            <Text style={styles.emptyDayText}>Brak wydarzeń na ten dzień</Text>
          </View>
        }
        contentContainerStyle={styles.eventsList}
      />

      {/* Add Event Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nowe wydarzenie</Text>
            <Text style={styles.modalDate}>
              {dayjs(selectedDate).format('D MMMM YYYY')}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Nazwa wydarzenia"
              placeholderTextColor={COLORS.textLight}
              value={newTitle}
              onChangeText={setNewTitle}
              autoFocus
            />

            <TextInput
              style={styles.input}
              placeholder="Godzina (np. 18:00) — opcjonalnie"
              placeholderTextColor={COLORS.textLight}
              value={newTime}
              onChangeText={setNewTime}
            />

            <Text style={styles.colorLabel}>Kolor:</Text>
            <View style={styles.colorPicker}>
              {EVENT_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorDot,
                    { backgroundColor: color },
                    newColor === color && styles.colorDotSelected,
                  ]}
                  onPress={() => setNewColor(color)}
                />
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.modalCancelText}>Anuluj</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirm}
                onPress={handleAddEvent}
              >
                <Text style={styles.modalConfirmText}>Dodaj 📅</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  calendar: {
    borderRadius: RADIUS.lg,
    margin: SPACING.sm,
    ...SHADOWS.sm,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  dateText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  addButtonText: {
    color: COLORS.textOnPrimary,
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
  },
  eventsList: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  eventDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: SPACING.sm,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  eventTime: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  eventDesc: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  emptyDay: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyDayText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textLight,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
  },
  modalTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  modalDate: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  input: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  colorLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  colorPicker: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: COLORS.text,
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  modalCancel: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  modalConfirm: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textOnPrimary,
    fontWeight: '700',
  },
});
