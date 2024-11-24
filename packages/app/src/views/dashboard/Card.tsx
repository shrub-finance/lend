export const Card = ({children}) => {
  return (
    <div className="relative bg-white overflow-x-auto group mt-4 w-full rounded-2xl border border-slate-200 h-max">
      {children}
    </div>
  )
}