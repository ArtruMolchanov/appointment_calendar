import axios from 'axios'
import { API_URL } from '../config'

export const getAvailableSpots = async (startTime, endTime) => {
  const data = {
    'start_time': startTime,
    'end_time': endTime
  }
  const result = await axios.post(API_URL + 'schedule/available_spots', data)
  return result.data
}

export const createCustomer = async (customerInfo) => {
  const result = await axios.post(API_URL + 'customers', customerInfo)
  return result.data
}

export const createSchedule = async (scheduleInfo) => {
  const result = await axios.post(API_URL + 'schedule', scheduleInfo)
  return result.data
}