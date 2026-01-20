import { createContext, useContext, useEffect, useState } from 'react'
import * as d3 from 'd3'

const DataContext = createContext()

export function DataProvider({ children }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    d3.csv('/dataset/dataset.csv').then(csvData => {
      setData(csvData)
      setLoading(false)
    })
  }, [])

  return (
    <DataContext.Provider value={{ data, loading }}>
      {children}
    </DataContext.Provider>
  )
}

export const useData = () => useContext(DataContext)
