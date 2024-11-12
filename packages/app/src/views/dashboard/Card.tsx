export const Card = ({children}) => {
  return (
    <div className="relative overflow-x-auto group mt-4 w-full rounded-2xl border h-max">
      {children}
    </div>
  )
}