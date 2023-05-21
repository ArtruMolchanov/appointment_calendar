import React, { useCallback, useEffect, useMemo, useState } from 'react'
import moment from 'moment-timezone'
import { TimezoneSelect, clientTz, findTzByKey } from 'timezone-select-js'
import { getAvailableSpots, createCustomer, createSchedule } from '../api/api'
import { Audio } from 'react-loader-spinner'

const calculateTimezone = (offsetStr, timeStr) => {
  let localOffsetStr = findTzByKey(clientTz()).offset

  offsetStr = offsetStr.replace('−', '-')
  localOffsetStr = localOffsetStr.replace('−', '-')

  let offsetHour = parseInt(offsetStr.split(':')[0])
  let offsetMinute = parseInt(offsetStr.split(':')[1])

  let localOffsetHour = parseInt(localOffsetStr.split(':')[0])
  let localOffsetMinute = parseInt(localOffsetStr.split(':')[1])

  let tmp = moment().format('yyyy-MM-DD') + ' ' + timeStr

  let returnVal = moment(tmp).add(offsetHour - localOffsetHour, 'hours').add(offsetMinute - localOffsetMinute, 'minutes').format('h:mm a')
  return returnVal
}

const MyLoader = ({ loading }) => {
  if (loading) {
    return (
      <div className='absolute w-full h-full' style={{ backgroundColor: 'rgba(240, 240, 240, 0.3)', zIndex: '10' }}>
        <div className='absolute' style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
          <Audio height="80"
            width="80"
            radius="9"
            color="green"
            ariaLabel="loading"
          >
          </Audio>
        </div>
      </div>
    )
  } else {
    return (<></>)
  }
}

const Appointment = () => {

  const [picker, setPicker] = useState({ day: moment().format('yyyy-MM-DD'), time: '', selectedMonth: moment() })
  const [timezone, setTimezone] = useState(clientTz())
  const [meetingPane, setMettingPane] = useState(false)
  const [availableSpots, setAvailableSpots] = useState([])
  const [currentDateSpots, setCurrentDateSpots] = useState([])
  const [bookedDates, setBookedDates] = useState([])
  const [offset, setOffset] = useState(findTzByKey(clientTz()).offset)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    let startDate = picker.selectedMonth.toDate()
    let endDate = picker.selectedMonth.add(1, 'months').set('date', 1)
    endDate = endDate.subtract(1, 'days').set('hour', 23).set('minute', 59).set('second', 59).toDate()
    const result = await getAvailableSpots(startDate, endDate)
    const extract = result.days.map(e => {
      const spots = e.spots.filter(itm => itm.status === 'available')
      const obj = { date: e.date, spots }
      return obj
    })
    const currentOne = extract.filter(e => e.date === picker.day)
    if (currentOne.length > 0) {
      setCurrentDateSpots(currentOne[0].spots)
    }
    setAvailableSpots(result.days)
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const setupCalendar = useCallback(() => {
    const day = moment(picker.selectedMonth)
    day.date(1)

    const weekday = day.weekday() || 7
    day.subtract({ day: weekday })

    let renderElement = []

    for (let i = 0; i < 42; i++) {
      let _temp = moment(day)
      let content = day.date()
      let className = 'm-2 w-12 h-12 flex justify-center items-center'
      let isToday = moment().format('yyyy-MM-DD') === day.format('yyyy-MM-DD')
      let isAvailable = (availableSpots.filter(e => e.date === day.format('yyyy-MM-DD'))).length > 0
      let isSelected = day.format('yyyy-MM-DD') === picker.day
      let isBooked = bookedDates.findIndex(e => e.date === day.format('yyyy-MM-DD')) > -1
      if (isToday) className += ' text-white bg-blue-600 rounded-full cursor-pointer'
      else {
        if (isSelected) className += ' text-white bg-indigo-300 rounded-full cursor-pointer'
        else if (isAvailable) className += ' bg-indigo-100 text-blue-600 rounded-full cursor-pointer'
      }
      if (!isAvailable && !isToday) className += ' text-gray-600 cursor-pointer'
      renderElement.push(
        <div key={'display-date' + i} className='relative'>
          <div className={className} onClick={(e) => { dateClicked(_temp.format('yyyy-MM-DD')) }}>
            {content}
            {isBooked && <div className='w-1 h-1 rounded-full absolute' style={{ bottom: '15px', backgroundColor: 'rgb(60, 63, 52)' }}></div>}
          </div>
        </div>
      )
      day.add({ day: 1 })
    }
    return renderElement
  }, [picker, availableSpots, bookedDates])

  const detailTime = useMemo(() => {
    let _c = calculateTimezone(offset, picker.time)
    let _m = moment(picker.day + ' ' + _c)
    let endTime = _m.add({ minute: 30 })
    endTime = endTime.format('h:mm a')
    let weekofday = _m.format('dddd')
    let date = _m.format('MMMM D')
    let year = _m.format('YYYY')
    return _c + '-' + endTime + ', ' + weekofday + ', ' + date + ', ' + year
  }, [picker, offset])

  const dateClicked = (_date) => {
    const date = moment(_date)
    let fstr = date.format('yyyy-MM-DD')
    const extract = availableSpots.map(e => {
      const spots = e.spots.filter(itm => itm.status === 'available')
      const obj = { date: e.date, spots }
      return obj
    })
    const currentOne = extract.filter(e => e.date === fstr)
    if (currentOne.length > 0) {
      setPicker({ ...picker, day: fstr, time: '' })
      setCurrentDateSpots(currentOne[0].spots)
    } else {
      return
    }
  }

  const changeMonth = (val) => {
    setCurrentDateSpots([])
    setPicker({ selectedMonth: picker.selectedMonth.add(val, 'months').date(1), day: moment().format('yyyy-MM-DD'), time: '' })
    setTimeout(() => {
      fetchData()
    }, 100);
  }

  const scheduleEvent = async () => {
    setLoading(true)

    try {
      let startTime = moment(picker.day + ' ' + picker.time)
      let endTime = moment(startTime).add({ minute: 30 })
      const customerResult = await createCustomer({
        'customer_contact_name': name.split(' ')[0],
        'customer_contact_last_name': name.split(' ')[1],
        'customer_contact_phone': phone
      })
      console.log('customerResult', customerResult)
      if (Object.keys(customerResult).length > 0) {
        const scheduleResult = await createSchedule({
          'customer_id': customerResult.customer_id,
          'start_time': startTime.toDate(),
          'end_time': endTime.toDate(),
          'address': address
        })
        if (Object.keys(scheduleResult).length > 0) {
          let _dates = [...bookedDates]
          _dates.push({ 'date': startTime.format('yyyy-MM-DD'), 'time': startTime.format('h:mm a') })
          setBookedDates(_dates)
          setMettingPane(false)
          setPicker({ ...picker, time: '' })
          setName('')
          setPhone('')
          setAddress('')
        }
        setLoading(false)
      }
    } catch (e) {
      console.log('scheduleEventCatch=>', e)
      setLoading(false)
    }
  }

  if (!meetingPane) {
    return (
      <>
        <div id='fluentc-widget'></div>
        <div className='block md:flex p-4' style={{ minWidth: '448px' }}>
          <div className='relative'>
            <MyLoader loading={loading}></MyLoader>
            <div className='flex justify-center items-center relative'>
              <div className='cursor-pointer hover:bg-gray-300 py-1 absolute' style={{ borderRadius: '6px', left: '40px' }} onClick={() => { changeMonth(-1) }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </div>
              <div className='text-2xl'>{moment(picker.selectedMonth).format('MMMM yyyy')}</div>
              <div className='cursor-pointer hover:bg-gray-300 py-1 absolute' style={{ borderRadius: '6px', right: '40px' }} onClick={() => { changeMonth(1) }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            </div>
            <div className='max-w-md'>
              <div className='flex'>
                <div className='m-2 w-12 h-12 flex justify-center items-center'>SUN</div>
                <div className='m-2 w-12 h-12 flex justify-center items-center'>MON</div>
                <div className='m-2 w-12 h-12 flex justify-center items-center'>TUE</div>
                <div className='m-2 w-12 h-12 flex justify-center items-center'>WED</div>
                <div className='m-2 w-12 h-12 flex justify-center items-center'>THU</div>
                <div className='m-2 w-12 h-12 flex justify-center items-center'>FRI</div>
                <div className='m-2 w-12 h-12 flex justify-center items-center'>SAT</div>
              </div>
              <div className='flex flex-wrap'>
                {setupCalendar().map(e => e)}
              </div>
            </div>
            <div className='mt-2 px-2'>
              <h4>Time zone</h4>
              <div className='flex items-center'>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12.75 3.03v.568c0 .334.148.65.405.864l1.068.89c.442.369.535 1.01.216 1.49l-.51.766a2.25 2.25 0 01-1.161.886l-.143.048a1.107 1.107 0 00-.57 1.664c.369.555.169 1.307-.427 1.605L9 13.125l.423 1.059a.956.956 0 01-1.652.928l-.679-.906a1.125 1.125 0 00-1.906.172L4.5 15.75l-.612.153M12.75 3.031a9 9 0 00-8.862 12.872M12.75 3.031a9 9 0 016.69 14.036m0 0l-.177-.529A2.25 2.25 0 0017.128 15H16.5l-.324-.324a1.453 1.453 0 00-2.328.377l-.036.073a1.586 1.586 0 01-.982.816l-.99.282c-.55.157-.894.702-.8 1.267l.073.438c.08.474.49.821.97.821.846 0 1.598.542 1.865 1.345l.215.643m5.276-3.67a9.012 9.012 0 01-5.276 3.67m0 0a9 9 0 01-10.275-4.835M15.75 9c0 .896-.393 1.7-1.016 2.25" />
                </svg>
                <TimezoneSelect onChange={(val) => { setTimezone(val.value); setOffset(val.offset); setPicker({ ...picker, time: '' }) }} value={timezone} className='flex-1 ml-1' />
              </div>
            </div>
          </div>
          <div>
            <div className='text-2xl'>{moment(picker.day).format('dddd, MMMM DD')}</div>
            <div className='rounded-full text-center bg-blue-600 px-4 py-1 text-white mt-3'>Show times you are free</div>
            <div className='mt-3 overflow-y-auto px-1' style={{maxHeight: '460px'}}>
              {
                currentDateSpots.length > 0 ? currentDateSpots.map((e, idx) => {
                  let cTime = moment(e.start_time).format('h:mm a')
                  let cDate = moment(e.start_time).format('yyyy-MM-DD')
                  let isBooked = bookedDates.filter(e => e.time === cTime && e.date === cDate).length > 0
                  if (!isBooked) {
                    if (picker.time && picker.time === cTime) {
                      return <div className='flex justify-between my-1' key={'time-btn' + idx}>
                        <div className='rounded-lg bg-gray-600 text-white text-center px-1 py-3 w-1/2 mr-1 cursor-pointer'>{calculateTimezone(offset, picker.time)}</div>
                        <div className='rounded-lg bg-blue-600 text-white text-center px-1 py-3 w-1/2 cursor-pointer hover:bg-blue-900' onClick={() => { setMettingPane(true); }}>Next</div>
                      </div>
                    } else {
                      return <div key={'time-btn' + idx} className='rounded-lg text-blue-600 py-3 my-1 cursor-pointer border border-blue-600 text-center font-bold hover:bg-blue-600 hover:text-white' onClick={() => { setPicker({ ...picker, time: cTime }) }}>{calculateTimezone(offset, cTime)}</div>
                    }
                  }
                }) : ''
              }
            </div>
          </div>
        </div>
      </>
    )
  } else {
    return (
      <>
        <div className='block md:flex p-4 relative' style={{ maxWidth: '768px', minWidth: '448px' }}>
          <MyLoader loading={loading}></MyLoader>
          <div className='px-2'>
            <div className='mb-2 flex rounded-full bg-white p-2 hover:border-none hover:bg-gray-300 cursor-pointer' style={{ width: 'fit-content', border: '1.5px solid #9d9292' }} onClick={() => { setMettingPane(false) }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </div>
            <div className='font-bold'>Mando Gomez</div>
            <div className='text-2xl font-bold'>30 Minute Meeting</div>
            <div className='mt-2' style={{ maxWidth: '250px' }}>
              <div className='flex items-start my-1'>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 flex-shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h5 className='ml-1 font-bold break-all'>30 min</h5>
              </div>
              <div className='flex items-start my-1'>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 flex-shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h5 className='ml-1 font-bold'>Web conferencing details provided upon confirmation.</h5>
              </div>
              <div className='flex items-start my-1'>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 flex-shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h5 className='ml-1 font-bold'>{detailTime}</h5>
              </div>
              <div className='flex items-start my-1'>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 flex-shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h5 className='ml-1 font-bold break-all'>{timezone}</h5>
              </div>
            </div>
          </div>
          <div className='px-4 md:border-l-2 border-black flex-1'>
            <div>Enter Details</div>
            <div className='my-1'>
              <div className='font-bold'>Name *</div>
              <input type='text' className='w-full' style={{ border: '1.5px solid #6c6868', borderRadius: '6px', textIndent: '6px', height: '36px' }} value={name} onChange={(e) => { setName(e.target.value) }}></input>
            </div>
            <div className='my-1'>
              <div className='font-bold'>Phone *</div>
              <input type='text' className='w-full' style={{ border: '1.5px solid #6c6868', borderRadius: '6px', textIndent: '6px', height: '36px' }} value={phone} onChange={(e) => { setPhone(e.target.value) }}></input>
            </div>
            <div className='my-1'>
              <div className='font-bold'>Address *</div>
              <textarea className='w-full py-1' style={{ border: '1.5px solid #6c6868', borderRadius: '6px', textIndent: '6px' }} rows={5} value={address} onChange={(e) => { setAddress(e.target.value) }}></textarea>
            </div>
            <div className='my-2 rounded-full bg-blue-600 hover:bg-blue-900 text-white text-center px-1 py-3 mt-1 w-1/2 cursor-pointer' onClick={scheduleEvent}>
              Schedule Event
            </div>
          </div>
        </div>
      </>
    )
  }
}

export default Appointment;